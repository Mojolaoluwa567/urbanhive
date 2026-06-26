window.addEventListener("load", () => {
  const tl = gsap.timeline();

  // Hero image: Dim and fade in
  tl.to(".hero img", {
    duration: 1.5,
    opacity: 1,
    filter: "brightness(0.8)", // Slightly dimmed, not too dark
    ease: "power2.out",
  })
    .from(
      ".hero-texty",
      {
        duration: 1.2,
        opacity: 0,
        y: 40,
        ease: "power2.out",
      },
      "-=1",
    )
    .from(
      ".hero-block1",
      {
        duration: 1,
        opacity: 0,
        x: -60,
        ease: "power2.out",
      },
      "-=0.6",
    )
    .from(
      ".hero-block2",
      {
        duration: 1,
        opacity: 0,
        x: 60,
        ease: "power2.out",
      },
      "-=0.6",
    )
    .from(
      ".cta-button",
      {
        duration: 0.8,
        opacity: 0,
        y: 20,
        ease: "power2.out",
      },
      "-=0.4",
    );
});

// Ticker setup
const updates = [
  "🔥 New arrivals dropping every week at UrbahnHive.",
  "💸 Get 20% off all orders above ₦50,000!",
  "🚚 Fast nationwide delivery available.",
  "✨ Luxury styles for less — Shop the Hive.",
  "💬 #UrbahnHive — Be bold. Be different. Be you.",
  "🎥 Follow Us on Tiktok @urbanhiveclothingstore",
  "📸 Follow Us on Instagram @urbanhive.clothing.store",
  "👻 Follow Us on Snapchat @urbanhive",
  "📱 Contact Us on WhatsApp +23470599427400.",
];

const tickerTrack = document.getElementById("ticker-track");

if (tickerTrack) {
  tickerTrack.innerHTML = updates
    .map((text) => `<span>${text}</span>`)
    .join("");
  // Duplicate once for seamless scroll
  tickerTrack.innerHTML += tickerTrack.innerHTML;
}
document.addEventListener("DOMContentLoaded", () => {
  const tickerTrack = document.getElementById("ticker-track");

  if (tickerTrack) {
    const content = tickerTrack.innerHTML;
    tickerTrack.innerHTML += content;
  }
});

// Testimonials slider (unchanged)
const slides = document.querySelectorAll(".testimonial-slide");
let currentSlide = 0;
slides[currentSlide].classList.add("active");

document.getElementById("nextBtn").addEventListener("click", function () {
  slides[currentSlide].classList.remove("active");
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add("active");
});

document.getElementById("prevBtn").addEventListener("click", function () {
  slides[currentSlide].classList.remove("active");
  currentSlide = (currentSlide - 1 + slides.length) % slides.length;
  slides[currentSlide].classList.add("active");
});

setInterval(() => {
  slides[currentSlide].classList.remove("active");
  currentSlide = (currentSlide + 1) % slides.length;
  slides[currentSlide].classList.add("active");
}, 5000);

const wm = document.getElementById("wordmark");
wm.innerHTML = wm.textContent
  .split("")
  .map((c) => `<span class="char">${c}</span>`)
  .join("");

// Intersection observer for entrance animation trigger
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.style.animationPlayState = "running";
      }
    });
  },
  { threshold: 0.1 },
);

document.querySelectorAll(".uh-fade-up").forEach((el) => {
  el.style.animationPlayState = "paused";
  observer.observe(el);
});

const track = document.getElementById("track");
const cards = Array.from(track.querySelectorAll(".uh-card"));
const dotsWrap = document.getElementById("dots");
const fill = document.getElementById("progressFill");
const currEl = document.getElementById("currentNum");
const totalEl = document.getElementById("totalNum");
const total = cards.length;
let current = 0;
let autoTimer = null;

totalEl.textContent = String(total).padStart(2, "0");

// Build dots
cards.forEach((_, i) => {
  const d = document.createElement("button");
  d.className = "uh-dot" + (i === 0 ? " is-active" : "");
  d.setAttribute("aria-label", `Go to testimonial ${i + 1}`);
  d.addEventListener("click", () => goTo(i));
  dotsWrap.appendChild(d);
});

function getDots() {
  return Array.from(dotsWrap.querySelectorAll(".uh-dot"));
}

function goTo(idx) {
  cards[current].classList.remove("is-active");
  getDots()[current].classList.remove("is-active");

  current = (idx + total) % total;

  cards[current].classList.add("is-active");
  getDots()[current].classList.add("is-active");

  // Scroll active card to near-center
  const cardWidth = cards[0].offsetWidth + 24; // gap
  const outerWidth = track.parentElement.offsetWidth;
  const offset = Math.max(
    0,
    cardWidth * current - (outerWidth / 2 - cardWidth / 2),
  );
  track.style.transform = `translateX(-${offset}px)`;

  // Progress bar
  fill.style.width = ((current + 1) / total) * 100 + "%";

  // Count
  currEl.textContent = String(current + 1).padStart(2, "0");
}

document.getElementById("prevBtn").addEventListener("click", () => {
  resetAuto();
  goTo(current - 1);
});
document.getElementById("nextBtn").addEventListener("click", () => {
  resetAuto();
  goTo(current + 1);
});

// Click on any card
cards.forEach((c, i) =>
  c.addEventListener("click", () => {
    resetAuto();
    goTo(i);
  }),
);

// Auto-play
function startAuto() {
  autoTimer = setInterval(() => goTo(current + 1), 4500);
}
function resetAuto() {
  clearInterval(autoTimer);
  startAuto();
}

// Drag / swipe
let startX = 0;
track.addEventListener("pointerdown", (e) => {
  startX = e.clientX;
});
track.addEventListener("pointerup", (e) => {
  const diff = startX - e.clientX;
  if (Math.abs(diff) > 40) {
    resetAuto();
    goTo(current + (diff > 0 ? 1 : -1));
  }
});

// Init
goTo(0);
startAuto();
