import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  imports: [Select, Button, FormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);
  protected paths = signal<string[]>([]);
  protected selectedPath = signal<string | null>(null);

  ngOnInit(): void {
    document.querySelector('input[name="file"]')?.addEventListener('change', (e) => {
      this.upload(e);
    });
    this.loadPaths();
  }

  protected preserve(): void {
    const path = this.selectedPath();
    if (!path) {
      return;
    }
    this.http.post('/api/preservation/sign', {}, { params: { path: path } }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Preservation successful',
          detail: 'Signed the selected data!',
        });
        this.selectedPath.set(null);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to sign the selected data (' + error.message + ')',
        });
      },
    });
  }

  protected upload(e: Event): void {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    if (!files) {
      return;
    }

    let formData = new FormData();

    // Iterate through every file in the folder.
    for (let file of files) {
      // Use the relative path as the field name to preserve directory structure.
      formData.append(file.webkitRelativePath, file);
    }

    this.http.post('/api/data/upload', formData, { responseType: 'text' }).subscribe({
      next: (response) => {
        if (response === 'ok') {
          this.messageService.add({
            severity: 'success',
            summary: 'Upload successful',
            detail: 'Files uploaded successfully',
          });
          this.loadPaths();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to upload files (' + response + ')',
          });
        }
      },
      error: (error) => {
        console.error('Network error:', error);
      },
    });
  }

  private loadPaths() {
    this.http.get<string[]>('/api/data/list/paths').subscribe({
      next: (paths) => {
        this.paths.set(paths);
      },
    });
  }
}
