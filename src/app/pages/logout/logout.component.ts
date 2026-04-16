import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  template: `<p>Logging out...</p>`
})
export class LogoutComponent implements OnInit {
  constructor(private auth: AuthService) {}

  ngOnInit() {
    this.auth.logout();
  }
}
