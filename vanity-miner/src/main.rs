use rayon::prelude::*;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Instant;
use tiny_keccak::{Hasher, Keccak};

fn keccak256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Keccak::v256();
    let mut output = [0u8; 32];
    hasher.update(data);
    hasher.finalize(&mut output);
    output
}

fn compute_create2_address(
    factory: &[u8; 20],
    salt: &[u8; 32],
    init_code_hash: &[u8; 32],
) -> [u8; 20] {
    let mut data = Vec::with_capacity(1 + 20 + 32 + 32);
    data.push(0xff);
    data.extend_from_slice(factory);
    data.extend_from_slice(salt);
    data.extend_from_slice(init_code_hash);
    
    let hash = keccak256(&data);
    let mut address = [0u8; 20];
    address.copy_from_slice(&hash[12..32]);
    address
}

fn main() {
    println!("=== Rust Vanity Address Miner (Ultra Fast!) ===\n");
    
    // Arachnid's Deterministic Deployment Proxy (public, on 100+ chains!)
    let factory: [u8; 20] = hex::decode("4e59b44847b379578588920cA78FbF26c0B4956C")
        .unwrap()
        .try_into()
        .unwrap();
    
    // EagleShareOFT bytecode hash
    let init_code_hash: [u8; 32] = hex::decode("485cabb7310f9eceaa728d3e0ca2149c40cd40421cabc8ce913c986fe644e654")
        .unwrap()
        .try_into()
        .unwrap();
    
    println!("Factory: 0x{}", hex::encode(factory));
    println!("Init Code Hash: 0x{}", hex::encode(init_code_hash));
    println!("Target: 0x47...ea91e\n");
    println!("Searching with all available CPU cores...\n");
    
    let found = Arc::new(AtomicBool::new(false));
    let counter = Arc::new(AtomicU64::new(0));
    let start = Instant::now();
    
    // Progress reporting thread
    let counter_clone = counter.clone();
    let found_clone = found.clone();
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_secs(1));
            if found_clone.load(Ordering::Relaxed) {
                break;
            }
            let count = counter_clone.load(Ordering::Relaxed);
            let elapsed = start.elapsed().as_secs_f64();
            let rate = count as f64 / elapsed;
            println!("Tried {} salts ({:.0}/sec)...", count, rate);
        }
    });
    
    // Parallel search
    (0..u64::MAX).into_par_iter().find_any(|&i| {
        if found.load(Ordering::Relaxed) {
            return false;
        }
        
        // Generate salt from counter
        let mut salt = [0u8; 32];
        salt[24..32].copy_from_slice(&i.to_be_bytes());
        
        // Compute address
        let address = compute_create2_address(&factory, &salt, &init_code_hash);
        
        counter.fetch_add(1, Ordering::Relaxed);
        
        // Check if matches pattern: 0x47...ea91e
        if address[0] == 0x47 && 
           address[17] == 0x0e && 
           address[18] == 0xa9 && 
           address[19] == 0x1e {
            found.store(true, Ordering::Relaxed);
            
            let elapsed = start.elapsed().as_secs_f64();
            let attempts = counter.load(Ordering::Relaxed);
            
            println!("\n🎉🎉🎉 VANITY ADDRESS FOUND! 🎉🎉🎉\n");
            println!("Address: 0x{}", hex::encode(address));
            println!("Salt: 0x{}", hex::encode(salt));
            println!("Attempts: {}", attempts);
            println!("Time: {:.1} seconds", elapsed);
            println!("Rate: {:.0} addresses/sec", attempts as f64 / elapsed);
            println!("\n📝 Use this salt to deploy!");
            
            return true;
        }
        
        false
    });
}

