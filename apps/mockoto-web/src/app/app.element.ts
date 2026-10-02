import './app.element.css';

export class AppElement extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<h1>Hello Mockoto</h1>`;
  }
}
customElements.define('mockoto-root', AppElement);
