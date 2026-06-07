import { Component } from '@angular/core';

@Component({
  selector: 'mk-contact-page',
  standalone: true,
  template: `
    <div class="mx-auto max-w-lg px-6 py-16">
      <!-- Card -->
      <div
        class="rounded-2xl border border-gray-100 bg-white p-10 dark:border-border dark:bg-surface"
      >
        <!-- Icon -->
        <div
          class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-accent"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <!-- Heading -->
        <h1 class="mb-2 text-xl font-semibold text-gray-900 dark:text-zinc-100">
          Contact
        </h1>
        <p
          class="mb-8 text-sm leading-relaxed text-gray-500 dark:text-zinc-500"
        >
          Have a question, idea, or feedback? Reach out — I read every message.
        </p>

        <!-- Email -->
        <a
          href="mailto:mockoto.founder@gmail.com"
          class="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 transition-colors hover:border-accent/30 hover:bg-accent/5 dark:border-border dark:bg-white/3 dark:hover:border-accent/30 dark:hover:bg-accent/5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="shrink-0 text-accent"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <span class="text-sm font-medium text-gray-800 dark:text-zinc-200"
            >mockoto.founder&#64;gmail.com</span
          >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="ml-auto shrink-0 text-gray-300 dark:text-zinc-700"
          >
            <path d="M7 7h10v10" />
            <path d="M7 17 17 7" />
          </svg>
        </a>
      </div>
    </div>
  `,
})
export class ContactPageComponent {}
