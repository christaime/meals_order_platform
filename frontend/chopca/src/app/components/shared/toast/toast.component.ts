import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '@components/shared/icon/icon.component';
import { ToastService, ToastKind } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  protected iconFor(kind: ToastKind): string {
    switch (kind) {
      case 'success': return 'check_circle';
      case 'error':   return 'error';
      case 'info':    return 'info';
    }
  }

  protected iconColorFor(kind: ToastKind): string {
    switch (kind) {
      case 'success': return 'text-secondary-fixed';
      case 'error':   return 'text-error-container';
      case 'info':    return 'text-primary-fixed';
    }
  }
}
