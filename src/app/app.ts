import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Component, effect, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { AnchorVerificationResult } from './interfaces/verification';

// ============================================================================
// Constants
// ============================================================================

const SIGNATURE_EXTENSIONS = ['.sce', '.asice', '.asics', '.scs'] as const;
const EVIDENCE_RECORD_EXTENSION = '.ers';

// ============================================================================
// Component
// ============================================================================

@Component({
  selector: 'app-root',
  imports: [Select, Button, FormsModule, ToastModule],
  providers: [MessageService],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  // --------------------------------------------------------------------------
  // Dependencies
  // --------------------------------------------------------------------------

  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);

  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------

  // Path lists
  protected paths = signal<string[]>([]);
  protected signaturePaths = signal<string[]>([]);
  protected erPaths = signal<string[]>([]);
  protected distributedPaths = signal<string[]>([]);
  protected blockchainPaths = signal<string[]>([]);

  // Selected items
  protected selectedPath = signal<string | null>(null);
  protected selectedSignaturePath = signal<string | null>(null);
  protected selectedEvidenceRecordPath = signal<string | null>(null);
  protected selectedDistributedPath = signal<string | null>(null);
  protected selectedBlockchainPath = signal<string | null>(null);

  // File inputs
  protected selectedFilesByDirectoryInput = signal<FileList | null>(null);
  protected selectedFilesByFileInput = signal<FileList | null>(null);

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  constructor() {
    effect(() => {
      const paths = this.paths();
      this.signaturePaths.set(
        paths.filter((p) => SIGNATURE_EXTENSIONS.some((ext) => p.endsWith(ext))),
      );
      this.erPaths.set(paths.filter((p) => p.endsWith(EVIDENCE_RECORD_EXTENSION)));
    });
  }

  ngOnInit(): void {
    this.setupFileInputListeners();
    this.loadPaths();
    this.loadDistributedPaths();
    this.loadBlockchainPaths();
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private setupFileInputListeners(): void {
    document.querySelector('#directoryInput')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.selectedFilesByDirectoryInput.set(target.files ?? null);
      console.log('Selected files:', this.selectedFilesByDirectoryInput());
    });

    document.querySelector('#fileInput')?.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      this.selectedFilesByFileInput.set(target.files ?? null);
      console.log('Selected files:', this.selectedFilesByFileInput());
    });
  }

  private parseFilename(contentDisposition: string): string | null {
    const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
    const matches = filenameRegex.exec(contentDisposition);

    if (!matches || matches.length < 1) return null;

    let filename = matches[1].trim();

    if (filename.startsWith('"') && filename.endsWith('"')) {
      filename = filename.slice(1, -1);
    }

    if (filename.startsWith("UTF-8''")) {
      filename = decodeURIComponent(filename.replace("UTF-8''", ''));
    }

    return filename;
  }

  private downloadFile(response: HttpResponse<Blob>, successMessage: string): void {
    const file = response.body;
    if (!file) return;

    const filename = this.parseFilename(response.headers.get('Content-Disposition') ?? '');
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename ?? 'download';
    a.click();

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: successMessage,
    });
  }

  private showError(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
    });
  }

  private showWarning(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Warning',
      detail: message,
    });
  }

  private loadPaths(): void {
    this.http.get<string[]>('/api/data/list/paths').subscribe({
      next: (paths) => this.paths.set(paths),
    });
  }

  private loadDistributedPaths(): void {
    this.http.get<string[]>('/api/distributed/system/list/data').subscribe({
      next: (paths) => this.distributedPaths.set(paths),
    });
  }

  private loadBlockchainPaths(): void {
    this.http.get<string[]>('/api/blockchain/list/data').subscribe({
      next: (paths) => this.blockchainPaths.set(paths),
    });
  }

  // --------------------------------------------------------------------------
  // Evidence Record Actions
  // --------------------------------------------------------------------------

  protected generateEvidenceRecord(): void {
    const path = this.selectedPath();
    if (!path) {
      this.showWarning('Please select a file first');
      return;
    }

    const params = new HttpParams().set('path', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });

    this.http
      .post<Blob>(
        '/api/evidence/record/create',
        {},
        {
          params,
          headers,
          observe: 'response',
          responseType: 'blob' as 'json',
        },
      )
      .subscribe({
        next: (response) => {
          this.downloadFile(response, 'Evidence record generated!');
          this.selectedPath.set(null);
        },
        error: (error) => {
          console.error(error);
          this.showError('Failed to generate evidence record');
        },
      });
  }

  protected verifyFileByER(): void {
    const path = this.selectedPath();
    const erPath = this.selectedEvidenceRecordPath();
    if (!path || !erPath) {
      this.showWarning('Please select both a file and an evidence record');
      return;
    }

    const params = new HttpParams().set('erPath', erPath).set('filePath', path);

    this.http.post<boolean>('/api/evidence/record/verify', {}, { params }).subscribe({
      next: (response) => {
        const message = response
          ? 'File verified by evidence record!'
          : 'Failed to verify file by evidence record';
        const severity = response ? 'success' : 'error';

        this.messageService.add({
          severity,
          summary: response ? 'Success' : 'Error',
          detail: message,
        });
      },
      error: (error) => {
        console.error(error);
        this.showError('Server error');
      },
    });
  }

  protected renewERTimeStamp(): void {
    const path = this.selectedEvidenceRecordPath();
    if (!path) {
      this.showWarning('Please select an evidence record first');
      return;
    }

    const params = new HttpParams().set('erPath', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });

    this.http
      .post<Blob>(
        '/api/evidence/record/renew/timestamp',
        {},
        {
          params,
          headers,
          observe: 'response',
          responseType: 'blob' as 'json',
        },
      )
      .subscribe({
        next: (response) => {
          this.downloadFile(response, 'Evidence record time stamp renewed!');
          this.selectedPath.set(null);
        },
        error: (error) => {
          console.error(error);
          this.showError('Failed to renew evidence record time stamp');
        },
      });
  }

  protected renewERHashTree(): void {
    const erPath = this.selectedEvidenceRecordPath();
    const filePath = this.selectedPath();
    if (!erPath || !filePath) {
      this.showWarning('Please select both an evidence record and a file');
      return;
    }

    const params = new HttpParams().set('erPath', erPath).set('filePath', filePath);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });

    this.http
      .post<Blob>(
        '/api/evidence/record/renew/hashtree',
        {},
        {
          params,
          headers,
          observe: 'response',
          responseType: 'blob' as 'json',
        },
      )
      .subscribe({
        next: (response) => {
          this.downloadFile(response, 'Evidence record hash tree renewed!');
          this.selectedPath.set(null);
        },
        error: (error) => {
          console.error(error);
          this.showError('Failed to renew evidence record hash tree');
        },
      });
  }

  // --------------------------------------------------------------------------
  // Distributed System Actions
  // --------------------------------------------------------------------------

  protected distribute(): void {
    const path = this.selectedPath();
    if (!path) {
      this.showWarning('Please select a file first');
      return;
    }

    const params = new HttpParams().set('path', path);

    this.http.post<boolean>('/api/distributed/system/distribute', {}, { params }).subscribe({
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
        this.showError('Failed to distribute data');
      },
    });
  }

  protected retrieveDistributedData(): void {
    const path = this.selectedDistributedPath();
    if (!path) {
      this.showWarning('Please select distributed data first');
      return;
    }

    const params = new HttpParams().set('path', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });

    this.http
      .get<Blob>('/api/distributed/system/retrieve', {
        params,
        headers,
        observe: 'response',
        responseType: 'blob' as 'json',
      })
      .subscribe({
        next: (response) => this.downloadFile(response, 'Retrieved the selected data!'),
        error: (error) => {
          console.error(error);
          this.showError('Failed to retrieve data');
        },
      });
  }

  // --------------------------------------------------------------------------
  // Distributed System Actions
  // --------------------------------------------------------------------------

  protected blockchainAnchor(): void {
    const path = this.selectedPath();
    if (!path) {
      this.showWarning('Please select a file first');
      return;
    }

    const params = new HttpParams().set('path', path);

    this.http
      .post<string>('/api/blockchain/anchor', {}, { params, responseType: 'text' as 'json' })
      .subscribe({
        next: (tx) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Data successfully anchored on blockchain transaction ' + tx,
          });
          this.loadBlockchainPaths();
        },
        error: (error) => {
          console.error(error);
          this.showError('Failed to anchor data on blockchain');
        },
      });
  }

  protected verifyFromBlockchain(): void {
    const path = this.selectedBlockchainPath();
    if (!path) {
      this.showWarning('Please select blockchain anchored data first');
      return;
    }

    const params = new HttpParams().set('path', path);
    const headers = new HttpHeaders({ Accept: 'application/json' });

    this.http
      .get<AnchorVerificationResult>('/api/blockchain/verify', {
        params,
        headers,
      })
      .subscribe({
        next: (res) => {
          if (res.match) {
            this.messageService.add({
              summary: 'Verification successfull',
              detail: 'Hash matches blockchain anchor!',
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Verification failed',
              detail:
                "Hashes don't match! File hash: " +
                res.currentHash +
                ', blockchain hash: ' +
                res.storedHash,
            });
          }
        },
        error: (error) => {
          console.error(error);
          this.showError('Failed to verify data');
        },
      });
  }
  // --------------------------------------------------------------------------
  // Signature Actions
  // --------------------------------------------------------------------------

  protected verifySignature(): void {
    const path = this.selectedSignaturePath();
    if (!path) {
      this.showWarning('Please select a signature file first');
      return;
    }

    const params = new HttpParams().set('path', path);

    this.http.post<boolean>('/api/signature/verify', {}, { params }).subscribe({
      next: (verificationSuccess) => {
        const severity = verificationSuccess ? 'success' : 'error';
        const summary = verificationSuccess ? 'Verification' : 'Verification failed';
        const detail = verificationSuccess
          ? 'Verification successful'
          : 'Some of the embedded signatures could not be verified.';

        this.messageService.add({ severity, summary, detail });
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
      this.showWarning('Please select a signature file first');
      return;
    }

    const params = new HttpParams().set('path', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });

    this.http
      .post<Blob>(
        '/api/signature/extend',
        {},
        {
          params,
          headers,
          observe: 'response',
          responseType: 'blob' as 'json',
        },
      )
      .subscribe({
        next: (response) => {
          this.downloadFile(response, 'Extended the selected data!');
          this.selectedPath.set(null);
        },
        error: (error) => {
          console.error(error);
          this.showError('Failed to extend the selected data');
        },
      });
  }

  protected sign(): void {
    const path = this.selectedPath();
    if (!path) {
      this.showWarning('Please select a file first');
      return;
    }

    const params = new HttpParams().set('path', path);
    const headers = new HttpHeaders({ Accept: 'application/octet-stream' });

    this.http
      .post<Blob>(
        '/api/signature/create',
        {},
        {
          params,
          headers,
          observe: 'response',
          responseType: 'blob' as 'json',
        },
      )
      .subscribe({
        next: (response) => {
          this.downloadFile(response, 'Signed the selected data!');

          const currentPath = this.selectedPath();
          if (currentPath && !this.paths().includes(currentPath)) {
            this.selectedPath.set(null);
          }
          const erPath = this.selectedEvidenceRecordPath();
          if (erPath && !this.paths().includes(erPath)) {
            this.selectedEvidenceRecordPath.set(null);
          }
        },
        error: (error) => {
          console.error(error);
          this.showError('Failed to sign the selected data');
        },
      });
  }

  // --------------------------------------------------------------------------
  // Upload Actions
  // --------------------------------------------------------------------------

  protected upload(fromDirectory: boolean): void {
    const files = fromDirectory
      ? this.selectedFilesByDirectoryInput()
      : this.selectedFilesByFileInput();

    if (!files) {
      this.showWarning('Please select files to upload first');
      return;
    }

    const formData = new FormData();

    for (const file of files) {
      let key = file.webkitRelativePath;
      if (!key || key.trim().length === 0) {
        key = file.name;
      }
      formData.append(key, file);
    }

    this.http.post('/api/data/upload', formData).subscribe({
      next: () => {
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
}
