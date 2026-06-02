const SPRITE_MAP: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '/sprites_hand/sprite_one.png',
  2: '/sprites_hand/sprite_two.png',
  3: '/sprites_hand/sprite_three.png',
  4: '/sprites_hand/sprite_four.png',
  5: '/sprites_hand/sprite_five.png',
}

const COUNT_LABEL: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'one finger',
  2: 'two fingers',
  3: 'three fingers',
  4: 'four fingers',
  5: 'five fingers',
}

interface HandSpriteProps {
  count: 1 | 2 | 3 | 4 | 5
  size?: number
}

export function HandSprite({ count, size = 52 }: HandSpriteProps) {
  return (
    <img
      src={SPRITE_MAP[count]}
      alt={COUNT_LABEL[count]}
      width={size}
      height={size}
      className="select-none"
      style={{ imageRendering: 'auto' }}
    />
  )
}
