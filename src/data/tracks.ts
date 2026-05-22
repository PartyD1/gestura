export interface Track {
  id: number
  title: string
  artist: string
  albumArt: string
  audioSrc: string
}

export const tracks: Track[] = [
  {
    id: 1,
    title: 'Neon Horizon',
    artist: 'SoundHelix',
    albumArt:
      'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&h=500&fit=crop',
    audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 2,
    title: 'Midnight Drive',
    artist: 'SoundHelix',
    albumArt:
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&h=500&fit=crop',
    audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 3,
    title: 'Electric Pulse',
    artist: 'SoundHelix',
    albumArt:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&h=500&fit=crop',
    audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    id: 4,
    title: 'Velvet Sky',
    artist: 'SoundHelix',
    albumArt:
      'https://images.unsplash.com/photo-1459742914694-040b24d0e0c9?w=500&h=500&fit=crop',
    audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  },
  {
    id: 5,
    title: 'Golden Wave',
    artist: 'SoundHelix',
    albumArt:
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&h=500&fit=crop',
    audioSrc: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  },
]
