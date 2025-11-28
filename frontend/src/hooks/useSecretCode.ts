import { useEffect, useState } from 'react';

/**
 * Hook to detect Konami code
 * Combo: ↑ ↑ ↓ ↓ ← → ← → B A
 */
export function useSecretCode() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [sequence, setSequence] = useState<string[]>([]);

  useEffect(() => {
    // Classic Konami code
    const konamiCode = [
      'ArrowUp', 
      'ArrowUp', 
      'ArrowDown', 
      'ArrowDown', 
      'ArrowLeft', 
      'ArrowRight', 
      'ArrowLeft', 
      'ArrowRight', 
      'KeyB', 
      'KeyA'
    ];
    
    const handleKeyPress = (e: KeyboardEvent) => {
      // Update sequence (keep last 10 keys to match Konami code length)
      const newSequence = [...sequence, e.code].slice(-10);
      setSequence(newSequence);

      // Check if it matches
      if (JSON.stringify(newSequence) === JSON.stringify(konamiCode)) {
        setIsUnlocked(true);
        // Play success sound or show notification
        console.log('🦅 Konami code unlocked! Admin panel activated!');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [sequence]);

  const lock = () => setIsUnlocked(false);

  return { isUnlocked, lock };
}

