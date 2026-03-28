import { Component, OnInit } from '@angular/core';
import { SearchService } from './services/search/search.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.sass']
})
export class AppComponent implements OnInit {
  public searchText = '';

  constructor(private searchService: SearchService) {}

  ngOnInit(): void {}

  onChange(value: string): void {
    this.searchText = value;
    this.searchService.search(value);
  }
}
