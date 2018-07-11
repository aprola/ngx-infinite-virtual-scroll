import { Component } from '@angular/core';

@Component({
  selector: 'ngx-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  increasingSizeData = Array(100).fill(0).map((_, i) => (1 + Math.floor(i / 1000)) * 20);
  increasingSizeData2 = Array(200).fill(0).map((_, i) => (1 + Math.floor(i / 1000)) * 20);
  iv = 0;
  loadMore() {
    console.log('more');
    this.iv += 100;
    if (this.iv > 400) return;
    // this.increasingSizeData = this.increasingSizeData.concat(Array(100).fill(0).map((_, i) => (1 + Math.floor(i / 1000)) * 20));
  }
  loadMore2() {
    console.log('more');
    this.increasingSizeData2 = this.increasingSizeData2.concat(Array(100).fill(0).map((_, i) => (1 + Math.floor(i / 1000)) * 20));
  }
}
