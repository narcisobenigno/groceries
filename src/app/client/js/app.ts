import * as Turbo from "@hotwired/turbo";

const application = Turbo.start();

document.addEventListener("turbo:load", () => {
  console.log("Turbo loaded a new page");
});

export default application;
