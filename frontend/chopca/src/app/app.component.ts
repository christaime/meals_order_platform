import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from '@components/shared/toast';
import { ChatWidgetComponent } from '@components/ai/chat-widget/chat-widget.component';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@core/services/i18n/language.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent , ChatWidgetComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {

  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  ngOnInit(): void {
    this.translate.use(this.language.current());
  }
}
