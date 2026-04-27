"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminI18n } from "./admin-i18n";

const GROUP_ORDER = ["companies", "contracts", "addresses", "orders"];
const GROUP_LABELS = {
  companies: "Companies",
  contracts: "Contracts",
  addresses: "Addresses",
  orders: "Orders",
};
const RESULT_GROUPS = [
  { key: "companies", title: "Housing Companies" },
  { key: "contracts", title: "Contracts" },
  { key: "objects", title: "Objects" },
  { key: "orders", title: "Orders" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function groupEntries(suggestions) {
  return GROUP_ORDER.flatMap((groupKey) => (suggestions[groupKey] || []).map((item) => ({
    ...item,
    groupKey,
  })));
}

function chipBadge(type) {
  if (type === "company") return "Company";
  if (type === "contract") return "Contract";
  if (type === "object") return "Object";
  if (type === "order") return "Order";
  return "Address";
}

function inferTypeFromToken(token) {
  return String(token || "").split(":")[0] || "";
}

function suggestionToChip(suggestion) {
  return {
    token: suggestion.token,
    type: suggestion.type,
    label: suggestion.label,
    badge: suggestion.badge || chipBadge(suggestion.type),
    description: suggestion.description || "",
  };
}

export function AdminEntitySearch({ period, kitchenId, status }) {
  const { translate } = useAdminI18n();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [chips, setChips] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState({
    companies: [],
    contracts: [],
    addresses: [],
    orders: [],
  });
  const [results, setResults] = useState({
    companies: [],
    contracts: [],
    objects: [],
    orders: [],
  });
  const [summary, setSummary] = useState({
    contracts: 0,
    orders: 0,
    revenue: 0,
    objects: 0,
  });
  const [totals, setTotals] = useState({
    companies: 0,
    contracts: 0,
    objects: 0,
    orders: 0,
  });
  const [inputLoading, setInputLoading] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestNonce, setRequestNonce] = useState(0);

  const flatSuggestions = useMemo(() => groupEntries(suggestions), [suggestions]);
  const hasSearchContext = chips.length > 0 || Boolean(query.trim());
  const hasActiveResults = chips.length > 0 || Boolean(results.companies.length || results.contracts.length || results.objects.length || results.orders.length);
  const showSuggestions = Boolean(query.trim()) && flatSuggestions.length > 0 && !error;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const trimmedQuery = query.trim();
    const nextParams = new URLSearchParams();
    if (trimmedQuery) {
      nextParams.set("q", trimmedQuery);
    }
    if (period) {
      nextParams.set("period", period);
    }
    if (kitchenId) {
      nextParams.set("kitchenId", kitchenId);
    }
    if (status) {
      nextParams.set("status", status);
    }
    chips.forEach((chip) => nextParams.append("selected", chip.token));

    const delay = window.setTimeout(async () => {
      setInputLoading(Boolean(trimmedQuery));
      setResultsLoading(chips.length > 0 || Boolean(trimmedQuery));
      setError("");

      try {
        const response = await fetch(`/api/admin/search?${nextParams.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Search request failed");
        }

        const data = await response.json();
        if (!controller.signal.aborted) {
          setSuggestions(data.suggestions || { companies: [], contracts: [], addresses: [], orders: [] });
          setResults(data.results || { companies: [], contracts: [], objects: [], orders: [] });
          setSummary(data.summary || { contracts: 0, orders: 0, revenue: 0, objects: 0 });
          setTotals(data.meta?.totals || { companies: 0, contracts: 0, objects: 0, orders: 0 });
          setActiveIndex(-1);
        }
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(fetchError instanceof Error ? fetchError.message : "Search request failed");
      } finally {
        if (!controller.signal.aborted) {
          setInputLoading(false);
          setResultsLoading(false);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(delay);
    };
  }, [chips, kitchenId, period, query, requestNonce, status]);

  function addChip(suggestion) {
    setChips((current) => {
      if (current.some((chip) => chip.token === suggestion.token)) {
        return current;
      }
      return [...current, suggestionToChip(suggestion)];
    });
    setQuery("");
    setSuggestions({ companies: [], contracts: [], addresses: [], orders: [] });
    setActiveIndex(-1);
  }

  function removeChip(token) {
    setChips((current) => current.filter((chip) => chip.token !== token));
  }

  function retry() {
    setRequestNonce((current) => current + 1);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      if (!flatSuggestions.length) return;
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % flatSuggestions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      if (!flatSuggestions.length) return;
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? flatSuggestions.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter") {
      if (activeIndex >= 0 && flatSuggestions[activeIndex]) {
        event.preventDefault();
        addChip(flatSuggestions[activeIndex]);
      }
      return;
    }

    if (event.key === "Escape") {
      setActiveIndex(-1);
      setSuggestions((current) => ({ ...current, companies: [], contracts: [], addresses: [], orders: [] }));
      return;
    }

    if (event.key === "Backspace" && !query && chips.length) {
      removeChip(chips[chips.length - 1].token);
    }
  }

  return (
    <section className="search-workspace">
      <div className="search-header">
        <div>
          <p className="search-eyebrow">{translate("dashboard.searchWorkspace", "Search workspace")}</p>
          <h2>{translate("dashboard.searchInsights", "Search Insights")}</h2>
          <p>{translate("dashboard.searchWorkspaceDetail", "Explore related companies, contracts, objects, and orders in real time.")}</p>
        </div>
        {resultsLoading && hasActiveResults ? <span className="loading-pill">{translate("dashboard.updating", "Updating")}</span> : null}
      </div>

      <div className="search-shell">
        <div className={`search-input-wrap${showSuggestions ? " is-open" : ""}`}>
          <div className="chip-row">
            {chips.map((chip) => (
              <button key={chip.token} type="button" className="chip" onClick={() => removeChip(chip.token)}>
                <span>{chip.label}</span>
                <small>{chip.badge || chipBadge(chip.type)}</small>
                <b aria-hidden="true">×</b>
              </button>
            ))}
            <div className="input-slot">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search contracts, companies, addresses…"
                aria-label="Search admin entities"
              />
              {inputLoading ? <span className="spinner" aria-hidden="true" /> : null}
            </div>
          </div>

          {showSuggestions ? (
            <div className="suggestions" role="listbox">
              {GROUP_ORDER.map((groupKey) => {
                const items = suggestions[groupKey] || [];
                if (!items.length) return null;

                return (
                  <div key={groupKey} className="suggestion-group">
                    <span className="suggestion-group__title">{GROUP_LABELS[groupKey]}</span>
                    {items.map((item) => {
                      const flatIndex = flatSuggestions.findIndex((entry) => entry.token === item.token);
                      return (
                        <button
                          key={item.token}
                          type="button"
                          className={`suggestion-item${flatIndex === activeIndex ? " is-active" : ""}`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            addChip(item);
                          }}
                        >
                          <div>
                            <strong>{item.label}</strong>
                            {item.description ? <span>{item.description}</span> : null}
                          </div>
                          <small>{item.badge || chipBadge(item.type)}</small>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="state-card state-card--error">
            <strong>{translate("dashboard.somethingWentWrong", "Something went wrong")}</strong>
            <button type="button" onClick={retry}>{translate("dashboard.retry", "Retry")}</button>
          </div>
        ) : null}

        {!hasSearchContext && !chips.length ? (
          <div className="state-card">
            <strong>{translate("dashboard.startTypingToExplore", "Start typing to explore companies, contracts, and addresses")}</strong>
          </div>
        ) : null}

        {hasSearchContext || chips.length ? (
          <>
            <div className="summary-grid">
              <article className="summary-card">
                <span>{translate("dashboard.contracts", "Contracts")}</span>
                <strong>{summary.contracts}</strong>
              </article>
              <article className="summary-card">
                <span>{translate("dashboard.orders", "Orders")}</span>
                <strong>{summary.orders}</strong>
              </article>
              <article className="summary-card">
                <span>{translate("dashboard.totalRevenue", "Revenue")}</span>
                <strong>{formatCurrency(summary.revenue)}</strong>
              </article>
              <article className="summary-card">
                <span>{translate("dashboard.objects", "Objects")}</span>
                <strong>{summary.objects}</strong>
              </article>
            </div>

            {!error && !resultsLoading && !hasActiveResults && chips.length ? (
              <div className="state-card">
                <strong>{translate("dashboard.noResultsMatchThisCombination", "No results match this combination")}</strong>
                <span>{translate("dashboard.tryRemovingFilters", "Try removing filters")}</span>
              </div>
            ) : null}

            <div className="results-grid">
              {RESULT_GROUPS.map((group) => (
                <ResultGroup
                  key={group.key}
                  title={group.title}
                  items={results[group.key] || []}
                  total={totals[group.key] || 0}
                  type={group.key}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <style jsx>{`
        .search-workspace {
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          background: linear-gradient(180deg, #fffef8 0%, #ffffff 38%);
          box-shadow: 0 20px 55px rgba(15, 23, 42, 0.08);
          padding: 20px;
          display: grid;
          gap: 16px;
        }

        .search-header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .search-eyebrow,
        .suggestion-group__title,
        .summary-card span {
          margin: 0 0 6px;
          color: #b45309;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        h2 {
          margin: 0;
          font-size: 1.3rem;
          color: #111827;
        }

        p {
          margin: 6px 0 0;
          color: #6b7280;
          line-height: 1.45;
        }

        .loading-pill {
          border-radius: 999px;
          background: rgba(180, 83, 9, 0.1);
          color: #92400e;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .search-shell {
          display: grid;
          gap: 14px;
        }

        .search-input-wrap {
          position: relative;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #ffffff;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .search-input-wrap.is-open {
          border-color: #d97706;
          box-shadow: 0 16px 40px rgba(217, 119, 6, 0.12);
        }

        .chip-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
          padding: 10px;
        }

        .chip {
          border: 0;
          border-radius: 999px;
          background: #111827;
          color: #ffffff;
          padding: 8px 12px;
          display: inline-flex;
          gap: 8px;
          align-items: center;
          cursor: pointer;
        }

        .chip small {
          color: rgba(255, 255, 255, 0.68);
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .chip b {
          font-size: 16px;
          line-height: 1;
        }

        .input-slot {
          flex: 1 1 220px;
          min-width: 220px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        input {
          flex: 1;
          min-height: 48px;
          border: 0;
          outline: none;
          background: transparent;
          color: #111827;
          font-size: 16px;
          padding: 0 4px;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          border: 2px solid rgba(217, 119, 6, 0.2);
          border-top-color: #d97706;
          animation: spin 0.8s linear infinite;
        }

        .suggestions {
          border-top: 1px solid #f3f4f6;
          padding: 10px;
          display: grid;
          gap: 12px;
        }

        .suggestion-group {
          display: grid;
          gap: 6px;
        }

        .suggestion-item {
          border: 0;
          border-radius: 12px;
          background: #fff7ed;
          padding: 12px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          text-align: left;
          cursor: pointer;
          color: #111827;
        }

        .suggestion-item.is-active {
          background: #fed7aa;
        }

        .suggestion-item strong,
        .state-card strong,
        .summary-card strong {
          display: block;
          color: #111827;
        }

        .suggestion-item span,
        .state-card span {
          color: #6b7280;
          line-height: 1.4;
        }

        .suggestion-item small {
          color: #92400e;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .state-card {
          border: 1px dashed #d1d5db;
          border-radius: 16px;
          background: #f9fafb;
          padding: 20px;
          display: grid;
          gap: 6px;
        }

        .state-card--error {
          border-style: solid;
          border-color: #fecaca;
          background: #fef2f2;
        }

        .state-card button {
          width: fit-content;
          min-height: 40px;
          border: 0;
          border-radius: 10px;
          background: #111827;
          color: #ffffff;
          padding: 0 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .summary-grid,
        .results-grid {
          display: grid;
          gap: 12px;
        }

        .summary-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .results-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .summary-card,
        :global(.result-group) {
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #ffffff;
        }

        .summary-card {
          padding: 16px;
        }

        .summary-card strong {
          font-size: 1.45rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1100px) {
          .summary-grid,
          .results-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .summary-grid,
          .results-grid {
            grid-template-columns: 1fr;
          }

          .input-slot {
            min-width: 100%;
          }
        }
      `}</style>
    </section>
  );
}

function ResultGroup({ title, items, total, type }) {
  const hasMore = total > items.length;

  return (
    <section className="result-group">
      <div className="result-group__header">
        <div>
          <span>{title}</span>
          <h3>{items.length}</h3>
        </div>
        {hasMore ? <small>Show more</small> : null}
      </div>
      {items.length ? (
        <div className="result-list">
          {items.map((item) => (
            <ResultCard key={item.id} item={item} type={type} />
          ))}
        </div>
      ) : (
        <div className="result-empty">No matches in this group</div>
      )}

      <style jsx>{`
        .result-group {
          padding: 16px;
          display: grid;
          gap: 12px;
        }

        .result-group__header {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-end;
        }

        .result-group__header span {
          color: #6b7280;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .result-group__header h3 {
          margin: 6px 0 0;
          color: #111827;
        }

        .result-group__header small {
          color: #d97706;
          font-weight: 800;
        }

        .result-list {
          display: grid;
          gap: 10px;
        }

        .result-empty {
          border-radius: 12px;
          background: #f9fafb;
          color: #6b7280;
          padding: 14px;
        }
      `}</style>
    </section>
  );
}

function ResultCard({ item, type }) {
  let href = "#";
  let title = "";
  let subtitle = "";
  let meta = "";

  if (type === "companies") {
    href = `/admin/property-owners/${item.id}`;
    title = item.name;
    subtitle = item.address || "No address";
    meta = `${item.objectCount} objects • ${item.contractCount} contracts • ${item.orderCount} orders`;
  } else if (type === "contracts") {
    href = `/admin/contracts?q=${encodeURIComponent(item.contractNumber)}`;
    title = item.contractNumber;
    subtitle = [item.companyName, item.objectName, item.kitchenName].filter(Boolean).join(" • ");
    meta = `${item.orderCount} orders • ${formatCurrency(item.revenue)}`;
  } else if (type === "objects") {
    href = `/admin/property-owners/${item.companyId}`;
    title = item.name;
    subtitle = item.companyName || "";
    meta = [item.address1, item.address2, [item.postalCode, item.city].filter(Boolean).join(" "), item.country].filter(Boolean).join(", ");
  } else if (type === "orders") {
    href = `/admin/orders/${item.id}`;
    title = item.orderNumber;
    subtitle = [item.customerName, item.companyName, item.contractNumber].filter(Boolean).join(" • ");
    meta = `${formatCurrency(item.totalPrice)} • ${formatDate(item.createdAt)}`;
  }

  return (
    <Link href={href} className="result-card">
      <strong>{title}</strong>
      {subtitle ? <span>{subtitle}</span> : null}
      {meta ? <small>{meta}</small> : null}

      <style jsx>{`
        .result-card {
          border: 1px solid #ececec;
          border-radius: 12px;
          background: #ffffff;
          padding: 14px;
          display: grid;
          gap: 4px;
          text-decoration: none;
        }

        .result-card strong {
          color: #111827;
        }

        .result-card span,
        .result-card small {
          color: #6b7280;
          line-height: 1.4;
        }
      `}</style>
    </Link>
  );
}
