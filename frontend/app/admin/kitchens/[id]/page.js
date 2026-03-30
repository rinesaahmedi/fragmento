import { ItemType, KitchenStatus } from "@prisma/client";
import { notFound } from "next/navigation";
import { getKitchenById } from "../../../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminKitchenDetailPage({ params }) {
  const kitchen = await getKitchenById(params.id);
  if (!kitchen) notFound();

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <section style={panelStyle}>
        <h1 style={{ marginTop: 0 }}>Edit kitchen</h1>
        <form action={`/api/admin/kitchens/${kitchen.id}`} method="post" style={formGridStyle}>
          <input type="hidden" name="_intent" value="update" />
          <input name="name" defaultValue={kitchen.name} required />
          <input name="slug" defaultValue={kitchen.slug} required />
          <select name="status" defaultValue={kitchen.status}>
            {Object.values(KitchenStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <textarea name="description" rows={3} defaultValue={kitchen.description || ""} />
          <button type="submit">Save kitchen</button>
        </form>
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Add item</h2>
        <form action={`/api/admin/kitchens/${kitchen.id}/items`} method="post" style={formGridStyle}>
          <select name="itemType" defaultValue={ItemType.COMPONENT}>
            {Object.values(ItemType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input name="code" placeholder="Unique code" required />
          <input name="name" placeholder="Display name" required />
          <input name="price" placeholder="349.00" required />
          <input name="iconKey" placeholder="icon key" />
          <input name="colorKey" placeholder="color key for components" />
          <input name="componentKey" placeholder="future component key" />
          <input name="sortOrder" type="number" defaultValue={0} />
          <textarea name="infoText" rows={2} placeholder="Optional product info" />
          <label><input name="isLocked" type="checkbox" value="true" /> Locked</label>
          <label><input name="isActive" type="checkbox" value="true" defaultChecked /> Active</label>
          <button type="submit">Add item</button>
        </form>
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Items</h2>
        <div style={{ display: "grid", gap: 16 }}>
          {kitchen.items.map((item) => (
            <form key={item.id} action={`/api/admin/items/${item.id}`} method="post" style={itemCardStyle}>
              <input type="hidden" name="_intent" value="update" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                <input name="name" defaultValue={item.name} required />
                <input name="code" defaultValue={item.code} required />
                <input name="price" defaultValue={Number(item.price).toFixed(2)} required />
                <input name="iconKey" defaultValue={item.iconKey || ""} />
                <input name="colorKey" defaultValue={item.colorKey || ""} />
                <input name="componentKey" defaultValue={item.componentKey || ""} />
                <input name="sortOrder" type="number" defaultValue={item.sortOrder} />
                <select name="itemType" defaultValue={item.itemType}>
                  {Object.values(ItemType).map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <input name="infoText" defaultValue={item.infoText || ""} />
              </div>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 10 }}>
                <label><input name="isLocked" type="checkbox" value="true" defaultChecked={item.isLocked} /> Locked</label>
                <label><input name="isActive" type="checkbox" value="true" defaultChecked={item.isActive} /> Active</label>
                <button type="submit">Save item</button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

const panelStyle = {
  background: "#fffdf9",
  border: "1px solid #e5d5c5",
  borderRadius: 16,
  padding: 20,
};

const formGridStyle = { display: "grid", gap: 12 };
const itemCardStyle = { border: "1px solid #ece0d5", borderRadius: 14, padding: 16 };
