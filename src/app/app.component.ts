import { Component, OnInit } from '@angular/core';
import { name, version } from '../../package.json';

import { SearchService } from './services/search/search.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {
  public searchText = '';

  constructor(private searchService: SearchService) {}

  ngOnInit(): void {
    console.info(`🌱 ${name} version ${version}`);
  }

  onChange(value: string): void {
    this.searchText = value;
    this.searchService.search(value);
  }
}
