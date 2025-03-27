'use client';

import React, { useState, useEffect, useRef } from 'react';

// Sound utility for managing game sounds
export const useSounds = () => {
  const [soundsLoaded, setSoundsLoaded] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const soundRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    // Initialize sounds
    const sounds = {
      start: new Audio('/sounds/playing-pac-man.mp3'),
      munch: new Audio('/sounds/arcade-videogame-sound.mp3'),
      death: new Audio('/sounds/arcade-videogame-sound.mp3'),
      eatGhost: new Audio('/sounds/arcade-videogame-sound.mp3'),
      powerPellet: new Audio('/sounds/arcade-videogame-sound.mp3'),
      levelComplete: new Audio('/sounds/playing-pac-man.mp3'),
    };

    // Set volume for each sound
    Object.values(sounds).forEach(sound => {
      sound.volume = 0.5;
    });

    soundRefs.current = sounds;
    setSoundsLoaded(true);

    return () => {
      // Cleanup sounds when component unmounts
      Object.values(sounds).forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
      });
    };
  }, []);

  // Play a sound if sounds are enabled
  const playSound = (soundName: string) => {
    if (soundsLoaded && soundsEnabled && soundRefs.current[soundName]) {
      // Reset the sound to the beginning if it's already playing
      soundRefs.current[soundName].currentTime = 0;
      soundRefs.current[soundName].play().catch(error => {
        console.error(`Error playing sound ${soundName}:`, error);
      });
    }
  };

  // Stop a sound
  const stopSound = (soundName: string) => {
    if (soundsLoaded && soundRefs.current[soundName]) {
      soundRefs.current[soundName].pause();
      soundRefs.current[soundName].currentTime = 0;
    }
  };

  // Toggle sounds on/off
  const toggleSounds = () => {
    setSoundsEnabled(prev => !prev);
  };

  return {
    playSound,
    stopSound,
    toggleSounds,
    soundsEnabled,
    soundsLoaded
  };
};
