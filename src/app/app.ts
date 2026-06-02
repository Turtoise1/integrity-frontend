import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

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
  protected signaturePaths = signal<string[]>([]);
  protected erPaths = signal<string[]>([]);
  protected distributedPaths = signal<string[]>([]);

  protected selectedPath = signal<string | null>(null);
  protected selectedSignaturePath = signal<string | null>(null);
  protected selectedEvidenceRecordPath = signal<string | null>(null);
  protected selectedDistributedPath = signal<string | null>(null);

  protected selectedFilesByDirectoryInput = signal<FileList | null>(null);
  protected selectedFilesByFileInput = signal<FileList | null>(null);

  constructor() {
    effect(() => {
      const paths = this.paths();
      this.signaturePaths.set(
        paths.filter(
          (p) =>
            p.endsWith('.sce') ||
            p.endsWith('.asice') ||
            p.endsWith('.asics') ||
            p.endsWith('.scs'),
        ),
      );
      this.erPaths.set(paths.filter((p) => p.endsWith('.ers')));
    });
  }

  ngOnInit(): void {
    document.querySelector('#directoryInput')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        this.selectedFilesByDirectoryInput.set(target.files);
      } else {
        this.selectedFilesByDirectoryInput.set(null);
      }
      console.log('Selected files:', this.selectedFilesByDirectoryInput());
    });
    document.querySelector('#fileInput')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        this.selectedFilesByFileInput.set(target.files);
      } else {
        this.selectedFilesByFileInput.set(null);
      }
      console.log('Selected files:', this.selectedFilesByFileInput());
    });
    this.loadPaths();
    this.loadDistributedPaths();
  }

  protected generateEvidenceRecord(): void {
    const path = this.selectedPath();
    if (!path) {
      return;
    }
    const params = new HttpParams().set('path', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });
    this.http
      .post<Blob>(
        '/api/evidence/record/create',
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
            summary: 'Success',
            detail: 'Evidence record generated!',
          });
          this.selectedPath.set(null);
        },
        error: (error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to generate evidence record',
          });
        },
      });
  }

  protected verifyFileByER() {
    const path = this.selectedPath();
    const erPath = this.selectedEvidenceRecordPath();
    if (!path || !erPath) {
      return;
    }
    const params = new HttpParams().set('erPath', erPath).set('filePath', path);
    this.http.post<boolean>('/api/evidence/record/verify', {}, { params: params }).subscribe({
      next: (response: boolean) => {
        if (response) {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'File verified by evidence record!',
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to verify file by evidence record',
          });
        }
      },
      error: (error) => {
        console.error(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Server error',
        });
      },
    });
  }

  protected renewERTimeStamp() {
    const path = this.selectedEvidenceRecordPath();
    if (!path) {
      return;
    }
    const params = new HttpParams().set('erPath', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });
    this.http
      .post<Blob>(
        '/api/evidence/record/renew/timestamp',
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
            summary: 'Success',
            detail: 'Evidence record time stamp renewed!',
          });
          this.selectedPath.set(null);
        },
        error: (error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to renew evidence record time stamp',
          });
        },
      });
  }

  protected renewERHashTree() {
    const erPath = this.selectedEvidenceRecordPath();
    const filePath = this.selectedPath();
    if (!erPath || !filePath) {
      return;
    }
    const params = new HttpParams().set('erPath', erPath).set('filePath', filePath);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });
    this.http
      .post<Blob>(
        '/api/evidence/record/renew/hashtree',
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
            summary: 'Success',
            detail: 'Evidence record hash tree renewed!',
          });
          this.selectedPath.set(null);
        },
        error: (error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to renew evidence record hash tree',
          });
        },
      });
  }

  protected distribute(): void {
    const path = this.selectedPath();
    if (!path) {
      return;
    }
    const params = new HttpParams().set('path', path);
    this.http
      .post<boolean>('/api/distributed/system/distribute', {}, { params: params })
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Distribution',
            detail: 'Data distributed successfully',
          });
          this.loadDistributedPaths();
        },
        error: (error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to distribute data',
          });
        },
      });
  }

  protected retrieveDistributedData(): void {
    const path = this.selectedDistributedPath();
    if (!path) {
      return;
    }
    const params = new HttpParams().set('path', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });
    this.http
      .get<Blob>('/api/distributed/system/retrieve', {
        params: params,
        headers: headers,
        observe: 'response',
        responseType: 'blob' as 'json',
      })
      .subscribe({
        next: (response) => {
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
            summary: 'Success',
            detail: 'Retrieved the selected data!',
          });
        },
        error: (error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to retrieve data',
          });
        },
      });
  }

  protected verifySignature(): void {
    const path = this.selectedSignaturePath();
    if (!path) {
      return;
    }
    const params = new HttpParams().set('path', path);
    this.http.post<boolean>('/api/signature/verify', {}, { params: params }).subscribe({
      next: (verificationSuccess) => {
        if (verificationSuccess) {
          this.messageService.add({
            severity: 'success',
            summary: 'Verification',
            detail: 'Verification successful',
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Verification failed',
            detail: 'Some of the embedded signatures could not be verified.',
          });
        }
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Verification failed',
          detail: 'Is the selected document signed?',
        });
      },
    });
  }

  protected extend(): void {
    const path = this.selectedSignaturePath();
    if (!path) {
      return;
    }
    const params = new HttpParams().set('path', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });
    this.http
      .post<Blob>(
        '/api/signature/extend',
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
            summary: 'Extend successful',
            detail: 'Extended the selected data!',
          });
          this.selectedPath.set(null);
        },
        error: (error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to extend the selected data',
          });
        },
      });
  }

  protected sign(): void {
    const path = this.selectedPath();
    if (!path) {
      return;
    }
    const params = new HttpParams().set('path', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });
    this.http
      .post<Blob>(
        '/api/signature/create',
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
          const path = this.selectedPath();
          if (path && !this.paths().includes(path)) {
            this.selectedPath.set(null);
          }
          const erPath = this.selectedEvidenceRecordPath();
          if (erPath && !this.paths().includes(erPath)) {
            this.selectedEvidenceRecordPath.set(null);
          }
        },
        error: (error) => {
          console.error(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to sign the selected data',
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

  protected upload(fromDirectory: boolean): void {
    const files = fromDirectory
      ? this.selectedFilesByDirectoryInput()
      : this.selectedFilesByFileInput();
    console.log(files);
    if (!files) {
      return;
    }

    let formData = new FormData();

    // Iterate through every file in the folder.
    for (let file of files) {
      if (file.webkitRelativePath) {
        // Use the relative path as the field name to preserve directory structure.
        formData.append(file.webkitRelativePath, file);
      } else {
        formData.append(file.name, file);
      }
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

  private loadDistributedPaths() {
    this.http.get<string[]>('/api/distributed/system/list/data').subscribe({
      next: (paths) => {
        this.distributedPaths.set(paths);
      },
    });
  }
}
