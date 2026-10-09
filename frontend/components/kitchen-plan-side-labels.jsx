import styles from "./kitchen-configurator.module.css";

export default function KitchenPlanSideLabels({ labels = [], twoPart = false }) {
  if (!labels.length) return null;
  return (
    <div className={styles.planSideLabelLayer} aria-hidden="true">
      {labels.map((label) => (
        <div
          key={label.label}
          className={`${styles.planSideLabel} ${twoPart ? styles.planSideLabelTwoPart : ""}`}
          style={{
            left: `${label.left}%`,
            top: `${label.top}%`,
            width: `${label.width}%`,
            ...(label.isFrameHeader ? {
              height: `${label.height}%`,
              minHeight: 0,
              padding: 0,
              transform: "none",
            } : {}),
          }}
        >
          <strong>{label.label}</strong>
        </div>
      ))}
    </div>
  );
}
