async function fetchSites() {
  const res = await fetch("/api/sites");
  if (!res.ok) throw new Error("Failed to load sites");
  return res.json();
}

async function fetchShots(siteId) {
  const res = await fetch(`/api/sites/${siteId}/shots`);
  if (!res.ok) throw new Error("Failed to load shots");
  return res.json();
}

function formatTimestamp(ts) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function renderTimeline(siteId, shots) {
  const container = document.getElementById("timeline");
  container.innerHTML = "";

  if (!siteId) {
    container.innerHTML =
      "<p class=\"hint\">Select a site to see its history.</p>";
    return;
  }

  if (!shots || shots.length === 0) {
    container.innerHTML =
      "<p class=\"hint\">No screenshots captured yet for this site.</p>";
    return;
  }

  // Newest first: reverse chronological order
  const orderedShots = [...shots].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() -
      new Date(a.timestamp).getTime(),
  );

  const list = document.createElement("div");
  list.className = "timeline-list";

  orderedShots.forEach((shot) => {
    const item = document.createElement("article");
    item.className = "timeline-item";

    const header = document.createElement("header");
    const title = document.createElement("h2");
    title.textContent = formatTimestamp(shot.timestamp);
    header.appendChild(title);

    if (shot.hasDiff) {
      const badge = document.createElement("span");
      badge.className = "diff-badge";
      badge.textContent = "Changed";
      header.appendChild(badge);
    }

    item.appendChild(header);

    const body = document.createElement("div");
    body.className = "timeline-body";

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "image-wrapper";

    const img = document.createElement("img");
    img.loading = "lazy";
    img.src = `/images/${siteId}/${shot.file}`;
    img.alt = `Screenshot at ${shot.timestamp}`;
    imgWrapper.appendChild(img);

    if (shot.hasDiff && shot.diffFile) {
      const diffToggle = document.createElement("button");
      diffToggle.className = "diff-toggle";
      diffToggle.textContent = "Show diff";

      const diffImg = document.createElement("img");
      diffImg.loading = "lazy";
      diffImg.src = `/images/${siteId}/${shot.diffFile}`;
      diffImg.alt = `Diff at ${shot.timestamp}`;
      diffImg.className = "diff-image hidden";

      diffToggle.addEventListener("click", () => {
        const isHidden = diffImg.classList.contains("hidden");
        diffImg.classList.toggle("hidden", !isHidden);
        diffToggle.textContent = isHidden
          ? "Hide diff"
          : "Show diff";
      });

      imgWrapper.appendChild(diffToggle);
      imgWrapper.appendChild(diffImg);
    }

    body.appendChild(imgWrapper);
    item.appendChild(body);

    list.appendChild(item);
  });

  container.appendChild(list);
}

async function init() {
  const select = document.getElementById("site-select");
  const siteLink = document.getElementById("site-link");
  let sites = [];

  try {
    sites = await fetchSites();
  } catch (err) {
    console.error(err);
    select.innerHTML =
      "<option value=\"\">Failed to load sites</option>";
    return;
  }

  select.innerHTML = "";
  if (!sites.length) {
    select.innerHTML =
      "<option value=\"\">No sites configured</option>";
    return;
  }

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Select a site…";
  select.appendChild(placeholder);

  sites.forEach((site) => {
    const opt = document.createElement("option");
    opt.value = site.id;
    opt.textContent = site.label;
    select.appendChild(opt);
  });

  // Hide link until a site is selected
  if (siteLink) {
    siteLink.style.visibility = "hidden";
  }

  renderTimeline("", []);

  select.addEventListener("change", async () => {
    const siteId = select.value;
    const site = sites.find((s) => s.id === siteId);

    if (site && siteLink) {
      siteLink.href = site.url;
      siteLink.style.visibility = "visible";
    } else if (siteLink) {
      siteLink.href = "#";
      siteLink.style.visibility = "hidden";
    }

    if (!siteId) {
      renderTimeline("", []);
      return;
    }
    try {
      const shots = await fetchShots(siteId);
      renderTimeline(siteId, shots);
    } catch (err) {
      console.error(err);
      alert("Failed to load screenshots for this site.");
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
