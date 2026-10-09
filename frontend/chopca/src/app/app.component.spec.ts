import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { ToastComponent } from '@components/shared/toast';
import { ChatWidgetComponent } from '@components/ai/chat-widget/chat-widget.component';
import { RouterOutlet } from '@angular/router';
import { CHAT_SERVICE } from '@core/services/ai';
import { ChatMockService } from '@mock/services/chat-mock.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent,RouterOutlet, ToastComponent, ChatWidgetComponent],
      providers:[
        {provide: CHAT_SERVICE, useValue:ChatMockService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
