import { Component, OnInit } from '@angular/core';
import { name, version } from '../../package.json';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  ngOnInit(): void {
    console.info(`🌱 ${name} version ${version}`);
  }
}
