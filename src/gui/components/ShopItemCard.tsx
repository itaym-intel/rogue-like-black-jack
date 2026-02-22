import type { ShopItem, Equipment, Consumable } from '../../engine/types';
import styles from './ShopItemCard.module.css';

const SLOT_ICONS: Record<string, string> = {
  weapon: '\u2694',
  helm: '\u26D1',
  armor: '\uD83D\uDEE1',
  boots: '\uD83D\uDC62',
  trinket: '\uD83D\uDC8E',
};

interface ShopItemCardProps {
  shopItem: ShopItem;
  displayNumber: number;
  onBuy: (index: number) => void;
}

function isEquipment(item: Equipment | Consumable): item is Equipment {
  return 'slot' in item;
}

export function ShopItemCard({ shopItem, displayNumber, onBuy }: ShopItemCardProps) {
  const { item, affordable } = shopItem;
  const icon = isEquipment(item) ? SLOT_ICONS[item.slot] ?? '?' : '\uD83E\uDDEA';

  return (
    <div className={`${styles.card} ${affordable ? styles.affordable : styles.unaffordable}`}>
      <kbd className={styles.keyHint}>{displayNumber}</kbd>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.info}>
        <span className={styles.name}>{item.name}</span>
        <span className={styles.desc}>({item.description})</span>
        <span className={styles.cost}>{item.cost} Gold</span>
      </div>
      <button
        className={styles.buyBtn}
        disabled={!affordable}
        onClick={() => onBuy(shopItem.index)}
      >
        Buy
      </button>
    </div>
  );
}
