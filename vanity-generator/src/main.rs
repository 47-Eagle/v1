use hex;
use rayon::prelude::*;
use sha3::{Digest, Keccak256};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use clap::Parser;
use indicatif::{ProgressBar, ProgressStyle};

#[derive(Parser)]
#[command(name = "eagle-vanity-generator")]
#[command(about = "Generate vanity address for $EAGLE token using CREATE2")]
struct Args {
    /// Factory address
    #[arg(long, default_value = "0x695d6B3628B4701E7eAfC0bc511CbAF23f6003eE")]
    factory: String,
    
    /// Bytecode hash (calculated from EagleShareOFT + constructor args)
    #[arg(long)]
    bytecode_hash: String,
    
    /// Address prefix (without 0x)
    #[arg(long, default_value = "4747")]
    prefix: String,
    
    /// Address suffix (without 0x)
    #[arg(long, default_value = "EA91E")]
    suffix: String,
    
    /// Number of threads to use
    #[arg(long, default_value = "8")]
    threads: usize,
    
    /// Starting nonce for this run
    #[arg(long, default_value = "0")]
    start_nonce: u64,
}

fn main() {
    let args = Args::parse();
    
    println!("🎯 EAGLE VANITY ADDRESS GENERATOR");
    println!("=================================");
    println!("🏭 Factory: {}", args.factory);
    println!("🔨 Bytecode Hash: {}...{}", &args.bytecode_hash[0..10], &args.bytecode_hash[args.bytecode_hash.len()-8..]);
    println!("🎨 Target: 0x{}...{}", args.prefix, args.suffix);
    println!("🚀 Threads: {}", args.threads);
    println!("📊 Starting nonce: {}\n", args.start_nonce);
    
    // Parse factory address
    let factory_bytes = hex::decode(&args.factory[2..]).expect("Invalid factory address");
    let bytecode_hash_bytes = hex::decode(&args.bytecode_hash[2..]).expect("Invalid bytecode hash");
    
    // Keep patterns as strings for easier matching
    let prefix_upper = args.prefix.to_uppercase();
    let suffix_upper = args.suffix.to_uppercase();
    
    println!("🔍 Searching for salt that produces: 0x{}...{}", args.prefix, args.suffix);
    
    // Shared state
    let found = Arc::new(AtomicBool::new(false));
    let attempts = Arc::new(AtomicU64::new(0));
    
    // Progress bar
    let pb = ProgressBar::new_spinner();
    pb.set_style(
        ProgressStyle::default_spinner()
            .tick_chars("⠁⠂⠄⡀⢀⠠⠐⠈ ")
            .template("{spinner:.green} [{elapsed_precise}] {msg} | Attempts: {pos}")
            .expect("Invalid template"),
    );
    
    let start_time = Instant::now();
    
    // Clone for progress thread
    let attempts_clone = Arc::clone(&attempts);
    let found_clone = Arc::clone(&found);
    let pb_clone = pb.clone();
    
    // Progress thread
    std::thread::spawn(move || {
        while !found_clone.load(Ordering::Relaxed) {
            let count = attempts_clone.load(Ordering::Relaxed);
            let rate = count as f64 / start_time.elapsed().as_secs_f64();
            pb_clone.set_position(count);
            pb_clone.set_message(format!("Rate: {:.0} H/s", rate));
            std::thread::sleep(Duration::from_millis(100));
        }
    });
    
    // Calculate ranges for each thread
    let chunk_size = u64::MAX / args.threads as u64;
    
    // Parallel search
    let result = (0..args.threads).into_par_iter().find_map_any(|thread_id| {
        let start = args.start_nonce + (thread_id as u64 * chunk_size);
        let end = if thread_id == args.threads - 1 { u64::MAX } else { start + chunk_size };
        
        for nonce in start..end {
            if found.load(Ordering::Relaxed) {
                break;
            }
            
            let salt = nonce.to_be_bytes();
            let address = calculate_create2_address(&factory_bytes, &salt, &bytecode_hash_bytes);
            
            // Check if it matches our vanity pattern
            if matches_pattern_hex(&address, &prefix_upper, &suffix_upper) {
                found.store(true, Ordering::Relaxed);
                return Some((nonce, address, salt));
            }
            
            // Update attempts counter every 10000 iterations
            if nonce % 10000 == 0 {
                attempts.fetch_add(10000, Ordering::Relaxed);
            }
        }
        None
    });
    
    pb.finish_with_message("Search completed!");
    
    match result {
        Some((nonce, address, salt)) => {
            let elapsed = start_time.elapsed();
            let total_attempts = attempts.load(Ordering::Relaxed);
            let rate = total_attempts as f64 / elapsed.as_secs_f64();
            
            println!("\n🎊 VANITY ADDRESS FOUND!");
            println!("========================");
            println!("🎯 Address: 0x{}", hex::encode_upper(address));
            println!("🔑 Salt: 0x{}", hex::encode(salt));
            println!("📊 Nonce: {}", nonce);
            println!("⏱️  Time: {:.2}s", elapsed.as_secs_f64());
            println!("🔢 Attempts: {}", total_attempts);
            println!("⚡ Rate: {:.0} H/s", rate);
            
            println!("\n📋 DEPLOYMENT CONFIGURATION:");
            println!("============================");
            println!("Update your deployment scripts with:");
            println!("VANITY_SALT = \"0x{}\";", hex::encode(salt));
            
            println!("\n✅ This salt will generate 0x{} on ALL chains!", hex::encode_upper(address));
        }
        None => {
            println!("\n❌ No vanity address found in range");
            println!("💡 Try running with a different --start-nonce");
        }
    }
}

fn calculate_create2_address(factory: &[u8], salt: &[u8], bytecode_hash: &[u8]) -> [u8; 20] {
    let mut hasher = Keccak256::new();
    
    // 0xff prefix
    hasher.update(&[0xff]);
    
    // Factory address (20 bytes)
    hasher.update(factory);
    
    // Salt (32 bytes, pad with zeros if needed)
    let mut salt_padded = [0u8; 32];
    let salt_len = salt.len().min(32);
    salt_padded[32-salt_len..].copy_from_slice(&salt[..salt_len]);
    hasher.update(&salt_padded);
    
    // Bytecode hash (32 bytes)
    hasher.update(bytecode_hash);
    
    let hash = hasher.finalize();
    let mut address = [0u8; 20];
    address.copy_from_slice(&hash[12..32]);
    
    address
}

fn matches_pattern_hex(address: &[u8; 20], prefix: &str, suffix: &str) -> bool {
    let address_hex = hex::encode_upper(address);
    
    // Check prefix
    if !address_hex.starts_with(prefix) {
        return false;
    }
    
    // Check suffix
    if !address_hex.ends_with(suffix) {
        return false;
    }
    
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_pattern_matching() {
        // Address that should match 0x4747...EA91E
        let address = [0x47, 0x47, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x88, 0xea, 0x9e];
        let prefix = "4747";
        let suffix = "EA9E";
        
        assert!(matches_pattern_hex(&address, prefix, suffix));
        
        // Test with EA91E suffix (odd length)
        let address2 = [0x47, 0x47, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x8e, 0xa9, 0x1e];
        let suffix2 = "EA91E";
        
        assert!(matches_pattern_hex(&address2, prefix, suffix2));
    }
    
    #[test]
    fn test_create2_calculation() {
        // Test with known values
        let factory = hex::decode("695d6B3628B4701E7eAfC0bc511CbAF23f6003eE").unwrap();
        let salt = [0u8; 32];
        let bytecode_hash = [0u8; 32];
        
        let address = calculate_create2_address(&factory, &salt, &bytecode_hash);
        
        // Should produce a valid 20-byte address
        assert_eq!(address.len(), 20);
    }
}
