import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
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
    const params = new HttpParams().set('path', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });
    this.http
      .post<Blob>(
        '/api/preservation/sign',
        {},
        { params: params, headers: headers, observe: 'response', responseType: 'blob' as 'json' },
      )
      .subscribe({
        next: (response: HttpResponse<Blob>) => {
          const file = response.body;
          if (!file) {
            return;
          }
          const filename = this.parseFilename(response.headers.get('Content-Disposition') ?? '');
          const url = URL.createObjectURL(file);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename ?? 'download';
          a.click();

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

  private parseFilename(contentDisposition: string): string | null {
    // Regex to extract filename (handles quotes and filename*=UTF-8'')
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(contentDisposition);

    if (!matches || matches.length < 1) return null;

    let filename = matches[1].trim();

    // Remove quotes if present
    if (filename.startsWith('"') && filename.endsWith('"')) {
      filename = filename.slice(1, -1);
    }

    // Handle UTF-8 encoded filenames (e.g., filename*=UTF-8''%E6%96%87%E4%BB%B6%E5%90%8D.csv)
    if (filename.startsWith("UTF-8''")) {
      filename = decodeURIComponent(filename.replace("UTF-8''", ''));
    }

    return filename;
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

    this.http.post('/api/data/upload', formData).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Upload successful',
          detail: 'Files uploaded successfully',
        });
        this.loadPaths();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to upload files (' + error.message + ')',
        });
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
