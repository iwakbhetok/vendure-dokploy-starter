import type { AnyRoute } from '@tanstack/react-router';
import { UploadIcon, DownloadIcon, FileTextIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@vendure/dashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@vendure/dashboard';

const LS_KEY_SESSION_TOKEN = 'vendure-session-token';

interface ImportResult {
    success: boolean;
    imported?: number;
    processed?: number;
    errors?: string[];
    error?: string;
}

function getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem(LS_KEY_SESSION_TOKEN);
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export function ProductImportPage(_route: AnyRoute) {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFile(e.target.files?.[0] ?? null);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const dropped = e.dataTransfer.files[0] ?? null;
        if (dropped) setFile(dropped);
    }

    async function handleDownloadTemplate() {
        try {
            const res = await fetch('/product-import/template', {
                headers: getAuthHeaders(),
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'product-import-template.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            toast.error('Download failed', {
                description: err instanceof Error ? err.message : 'Could not download template.',
            });
        }
    }

    async function handleImport() {
        if (!file) return;
        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/product-import/upload', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: formData,
            });
            const data: ImportResult = await res.json();

            if (data.success) {
                const warnings = data.errors?.length ?? 0;
                toast.success('Import complete', {
                    description: `${data.imported} product${data.imported === 1 ? '' : 's'} imported from ${data.processed} rows.${warnings > 0 ? ` ${warnings} warning${warnings === 1 ? '' : 's'}.` : ''}`,
                });
                if (warnings > 0) {
                    data.errors!.forEach(err =>
                        toast.warning('Import warning', { description: err }),
                    );
                }
                setFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } else {
                toast.error('Import failed', {
                    description: data.error ?? 'An unknown error occurred.',
                });
            }
        } catch {
            toast.error('Import failed', { description: 'Network error. Please try again.' });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Import Products</h1>
                <p className="text-muted-foreground mt-1">
                    Upload a CSV or Excel file to bulk-import products into your catalog.
                </p>
            </div>

            {/* Template download */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Step 1 – Download the template</CardTitle>
                    <CardDescription>
                        Use the official import format. Fill in your products and save as CSV or XLSX.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                        <DownloadIcon className="mr-2 h-4 w-4" />
                        Download Template (CSV)
                    </Button>

                    <div className="mt-4 rounded-md bg-muted p-4 text-sm font-mono text-muted-foreground overflow-x-auto">
                        <p className="font-semibold text-foreground mb-1">Required columns:</p>
                        <p>name, slug, description, sku, price, taxCategory, stockOnHand, trackInventory</p>
                        <p className="mt-1 text-xs">Optional: assets, facets, optionGroups, optionValues, variantAssets, variantFacets</p>
                        <p className="mt-2 text-xs">💡 Price is in the smallest currency unit (e.g. 2999 = $29.99). Leave name/slug/description empty for additional variant rows.</p>
                    </div>
                </CardContent>
            </Card>

            {/* File upload */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Step 2 – Upload your file</CardTitle>
                    <CardDescription>Supports .csv, .xlsx, and .xls formats (max 10 MB).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Drop zone */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                            dragOver
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50 hover:bg-muted/40'
                        }`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                    >
                        <UploadIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        {file ? (
                            <div className="flex items-center justify-center gap-2 text-sm">
                                <FileTextIcon className="h-4 w-4 text-primary" />
                                <span className="font-medium">{file.name}</span>
                                <span className="text-muted-foreground">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                </span>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Drag & drop a file here, or <span className="text-primary font-medium">click to browse</span>
                            </p>
                        )}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    {file && (
                        <div className="flex gap-2">
                            <Button
                                onClick={handleImport}
                                disabled={loading}
                                className="flex-1"
                            >
                                {loading ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent inline-block" />
                                        Importing…
                                    </>
                                ) : (
                                    <>
                                        <UploadIcon className="mr-2 h-4 w-4" />
                                        Import Products
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                disabled={loading}
                            >
                                Clear
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
