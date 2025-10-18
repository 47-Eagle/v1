use hex::ToHex;
use rand::Rng;
use rayon::prelude::*;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tiny_keccak::{Hasher, Keccak};

// CREATE2 address calculation
fn create2_address(factory: &[u8; 20], salt: &[u8; 32], init_code_hash: &[u8; 32]) -> [u8; 20] {
    let mut hasher = Keccak::v256();
    hasher.update(&[0xff]);
    hasher.update(factory);
    hasher.update(salt);
    hasher.update(init_code_hash);
    
    let mut hash = [0u8; 32];
    hasher.finalize(&mut hash);
    
    let mut address = [0u8; 20];
    address.copy_from_slice(&hash[12..32]);
    address
}

fn main() {
    println!("\n=== Wrapper Vanity Finder (0x47...ea91e) ===\n");
    
    // Configuration
    let factory: [u8; 20] = hex::decode("AA28020DDA6b954D16208eccF873D79AC6533833")
        .unwrap()
        .try_into()
        .unwrap();
    
    let init_code_hash: [u8; 32] = hex::decode("7f4e8166ddda12d0f4dbab33c68115dc924fa083ce4acdba8cd492573d4dc86f")
        .unwrap()
        .try_into()
        .unwrap();
    
    // Pattern: starts with 0x47, ends with ea91e
    let prefix = vec![0x47];
    let suffix = vec![0xea, 0x91, 0xe]; // Last 2.5 bytes
    
    println!("Factory: 0x{}", hex::encode(factory));
    println!("Init Code Hash: 0x{}", hex::encode(init_code_hash));
    println!("Pattern: 0x47...ea91e");
    println!("\nSearching with {} CPU cores...\n", rayon::current_num_threads());
    
    let found = Arc::new(AtomicBool::new(false));
    let counter = Arc::new(AtomicU64::new(0));
    let start = Instant::now();
    
    // Search in parallel
    let result: Option<([u8; 32], [u8; 20])> = (0..1_000_000_000u64)
        .into_par_iter()
        .find_map_any(|_| {
            if found.load(Ordering::Relaxed) {
                return None;
            }
            
            // Generate random salt
            let mut rng = rand::thread_rng();
            let salt: [u8; 32] = rng.gen();
            
            // Calculate address
            let address = create2_address(&factory, &salt, &init_code_hash);
            
            // Update counter
            let count = counter.fetch_add(1, Ordering::Relaxed) + 1;
            if count % 100_000 == 0 {
                let elapsed = start.elapsed().as_secs_f64();
                let rate = count as f64 / elapsed;
                println!("  Attempts: {} | Rate: {:.0}/s | Time: {:.1}s", 
                         count, rate, elapsed);
            }
            
            // Check if it matches pattern
            // Prefix: first byte must be 0x47
            if address[0] != prefix[0] {
                return None;
            }
            
            // Suffix: must end with EXACTLY ea91e (last 5 hex chars)
            // In hex string: ...ea91e means:
            // - address[17] low nibble = 0xe  -> (address[17] & 0x0f) == 0x0e
            // - address[18] = 0xa9
            // - address[19] = 0x1e
            // This gives us: ?ea91e where ? is the high nibble of address[17]
            
            if (address[17] & 0x0f) == 0x0e &&  // Last nibble of byte 17 is 'e'
               address[18] == 0xa9 &&            // Byte 18 is 'a9'
               address[19] == 0x1e {             // Byte 19 is '1e'
                found.store(true, Ordering::Relaxed);
                Some((salt, address))
            } else {
                None
            }
        });
    
    let elapsed = start.elapsed();
    let total_attempts = counter.load(Ordering::Relaxed);
    
    if let Some((salt, address)) = result {
        println!("\n✅ FOUND!");
        println!("\n🎯 Vanity Address: 0x{}", hex::encode(address));
        println!("🔑 Salt: 0x{}", hex::encode(salt));
        println!("\n📊 Stats:");
        println!("  Attempts: {}", total_attempts);
        println!("  Time: {:.2}s", elapsed.as_secs_f64());
        println!("  Rate: {:.0} attempts/s", total_attempts as f64 / elapsed.as_secs_f64());
        
        // Save to file
        use std::fs;
        let output = format!(
            "VANITY_SALT=0x{}\nVANITY_ADDRESS=0x{}\nATTEMPTS={}\nTIME_SECONDS={:.2}\n",
            hex::encode(salt),
            hex::encode(address),
            total_attempts,
            elapsed.as_secs_f64()
        );
        fs::write("../vanity-result.txt", output).unwrap();
        println!("\n💾 Saved to vanity-result.txt");
    } else {
        println!("\n❌ Not found after {} attempts", total_attempts);
    }
}
