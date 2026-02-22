import type { GameView, PlayerAction } from '../../engine/types';
import { HeaderBar } from '../components/HeaderBar';
import { ShopItemCard } from '../components/ShopItemCard';
import styles from './ShopScreen.module.css';

interface ScreenProps {
  view: GameView;
  onAction: (action: PlayerAction) => void;
}

export function ShopScreen({ view, onAction }: ScreenProps) {
  const items = view.shop?.items ?? [];

  return (
    <div className={styles.layout}>
      <HeaderBar view={view} />
      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <div className={styles.goldPanel}>
            <h2 className={styles.panelHeader}>Player Gold</h2>
            <span className={styles.goldAmount}>
              <span className={styles.goldIcon}>●</span> {view.player.gold}
            </span>
          </div>
        </aside>
        <main className={styles.main}>
          <h2 className={styles.shopTitle}>Shop Inventory</h2>
          <div className={styles.grid}>
            {items.map((item, i) => (
              <ShopItemCard
                key={item.index}
                shopItem={item}
                displayNumber={i + 1}
                onBuy={(idx) => onAction({ type: 'buy_item', itemIndex: idx })}
              />
            ))}
          </div>
          <button
            className={styles.skipBtn}
            onClick={() => onAction({ type: 'skip_shop' })}
          >
            Skip Shop
          </button>
        </main>
      </div>
    </div>
  );
}
