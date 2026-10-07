import { Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [],
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPageComponent {
  protected readonly contact = {
    email: 'mnchristelle@gmail.com',
    phone: '+237695282983',
    phoneDisplay: '+237 695 282 983',
  } as const;

}
