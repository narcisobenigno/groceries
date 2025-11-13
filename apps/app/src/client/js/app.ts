import htmx from "htmx.org";

// HTMX auto-initializes, no need to call start()

// Optional: Add event listeners for debugging
document.addEventListener("htmx:afterSwap", (event) => {
  console.log("HTMX swapped content", event);
});

document.addEventListener("htmx:afterRequest", (event) => {
  console.log("HTMX completed request", event);
});

export default htmx;
