use hex;
use rayon::prelude::*;
use sha3::{Digest, Keccak256};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    
    if args.len() != 5 {
        eprintln!("Usage: {} <bytecode_hash> <factory_address> <prefix> <suffix>", args[0]);
        eprintln!("Example: {} 6aee8051d42d987533b6f19aa86231baa9c99e2cb278656ea5481c83f917a693 695d6B3628B4701E7eAfC0bc511CbAF23f6003eE 47 EA91E", args[0]);
        std::process::exit(1);
    }
    
    let bytecode_hash_hex = &args[1];
    let factory_hex = &args[2];
    let prefix = &args[3];
    let suffix = &args[4];
    
    println!("🎯 VANITY ADDRESS GENERATOR");
    println!("===========================");
    println!("Factory: 0x{}", factory_hex);
    println!("Bytecode Hash: 0x{}", bytecode_hash_hex);
    println!("Target: 0x{}...{}", prefix, suffix);
    println!("Threads: {}", rayon::current_num_threads());
    
    // Parse hex inputs
    let bytecode_hash = hex::decode(bytecode_hash_hex).expect("Invalid bytecode hash");
    let factory = hex::decode(factory_hex).expect("Invalid factory address");
    
    if bytecode_hash.len() != 32 {
        eprintln!("Error: Bytecode hash must be 32 bytes");
        std::process::exit(1);
    }
    
    if factory.len() != 20 {
        eprintln!("Error: Factory address must be 20 bytes");
        std::process::exit(1);
    }
    
    let found = Arc::new(AtomicBool::new(false));
    let start_time = Instant::now();
    let mut attempts: u64 = 0;
    
    println!("\n🔍 Searching for vanity salt...");
    
    // Search in parallel chunks
    const CHUNK_SIZE: u64 = 1_000_000;
    
    loop {
        if found.load(Ordering::Relaxed) {
            break;
        }
        
        let chunk_start = attempts;
        let chunk_end = attempts + CHUNK_SIZE;
        
        let result = (chunk_start..chunk_end)
            .into_par_iter()
            .find_any(|&i| {
                if found.load(Ordering::Relaxed) {
                    return false;
                }
                
                // Create salt from counter
                let mut salt = [0u8; 32];
                salt[24..32].copy_from_slice(&i.to_be_bytes());
                
                // Calculate CREATE2 address
                let address = create2_address(&factory, &salt, &bytecode_hash);
                let address_hex = hex::encode(&address);
                
                // Check if it matches our pattern
                if address_hex.starts_with(prefix) && address_hex.ends_with(suffix) {
                    found.store(true, Ordering::Relaxed);
                    
                    println!("\n🎉 VANITY ADDRESS FOUND!");
                    println!("========================");
                    println!("Salt: 0x{}", hex::encode(&salt));
                    println!("Address: 0x{}", address_hex);
                    println!("Attempts: {}", i + 1);
                    println!("Time: {:.2?}", start_time.elapsed());
                    println!("Rate: {:.0} attempts/sec", (i + 1) as f64 / start_time.elapsed().as_secs_f64());
                    
                    return true;
                }
                
                // Progress update every 100k attempts
                if i % 100_000 == 0 && i > 0 {
                    let elapsed = start_time.elapsed().as_secs_f64();
                    if elapsed > 0.0 {
                        println!("💫 {} attempts ({:.0}/sec)", i, i as f64 / elapsed);
                    }
                }
                
                false
            });
        
        if result.is_some() {
            break;
        }
        
        attempts = chunk_end;
        
        // Progress update
        let elapsed = start_time.elapsed().as_secs_f64();
        if elapsed > 10.0 && attempts % CHUNK_SIZE == 0 {
            println!("💫 {} attempts ({:.0}/sec)", attempts, attempts as f64 / elapsed);
        }
        
        // Safety check - don't run indefinitely
        if attempts > 1_000_000_000 {
            println!("⚠️  Reached 1 billion attempts. Pattern might be too complex.");
            println!("   Consider using a simpler pattern or different prefix/suffix.");
            break;
        }
    }
    
    if !found.load(Ordering::Relaxed) {
        println!("❌ Vanity address not found after {} attempts", attempts);
        std::process::exit(1);
    }
}

fn create2_address(factory: &[u8], salt: &[u8], bytecode_hash: &[u8]) -> [u8; 20] {
    let mut hasher = Keccak256::new();
    hasher.update(&[0xff]); // CREATE2 prefix
    hasher.update(factory);  // Factory address (20 bytes)
    hasher.update(salt);     // Salt (32 bytes)  
    hasher.update(bytecode_hash); // Bytecode hash (32 bytes)
    
    let hash = hasher.finalize();
    let mut address = [0u8; 20];
    address.copy_from_slice(&hash[12..32]); // Take last 20 bytes
    address
}
