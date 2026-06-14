import {
    Controller,
    Get,
    Post,
    Res,
    Req,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response, Request } from 'express';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { ProductImportService } from './product-import.service';

@Controller('product-import')
export class ProductImportController {
    constructor(private productImportService: ProductImportService) {}

    @Get('template')
    @Allow(Permission.CreateProduct)
    downloadTemplate(@Ctx() ctx: RequestContext, @Res() res: Response) {
        const csv = this.productImportService.getTemplateCSV();
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="product-import-template.csv"');
        res.send(csv);
    }

    @Post('upload')
    @Allow(Permission.CreateProduct)
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
            fileFilter: (_req, file, cb) => {
                const name = file.originalname.toLowerCase();
                const allowed =
                    name.endsWith('.csv') ||
                    name.endsWith('.xlsx') ||
                    name.endsWith('.xls') ||
                    file.mimetype.includes('csv') ||
                    file.mimetype.includes('sheet') ||
                    file.mimetype.includes('excel');
                if (allowed) {
                    cb(null, true);
                } else {
                    cb(new Error('Only CSV and Excel files (.csv, .xlsx, .xls) are allowed.'), false);
                }
            },
        }),
    )
    async uploadFile(
        @Ctx() ctx: RequestContext,
        @UploadedFile() file: Express.Multer.File,
        @Res() res: Response,
    ) {
        if (!file) {
            res.status(400).json({ success: false, error: 'No file uploaded.' });
            return;
        }

        try {
            const csvContent = await this.productImportService.parseFileToCSV(
                file.buffer,
                file.originalname,
                file.mimetype,
            );
            const result = await this.productImportService.importProducts(ctx, csvContent);
            res.json({ success: true, ...result });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Import failed.';
            res.status(500).json({ success: false, error: message });
        }
    }
}
