import type { Cell, SheetData } from 'write-excel-file/browser';

export interface ExportColumn<T> {
  title: string;
  /** Ширина колонки в символах */
  width: number;
  cell: (row: T) => Cell;
}

export interface ExportOptions<T> {
  fileName: string;
  sheetName: string;
  columns: ExportColumn<T>[];
  rows: T[];
  /** Пары «параметр — значение» для второго листа: с какими условиями сделана выгрузка */
  summary: [string, string][];
}

const HEADER_STYLE = {
  fontWeight: 'bold',
  backgroundColor: '#E9ECEF',
  bottomBorderStyle: 'thin',
  bottomBorderColor: '#ADB5BD',
} as const;

/**
 * Собирает .xlsx и отдаёт его браузеру на скачивание.
 * Библиотека подгружается лениво — только при первой выгрузке, стартовый бандл не растёт.
 */
export async function downloadXlsx<T>(options: ExportOptions<T>): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');

  const data: SheetData = [
    options.columns.map((c) => ({ value: c.title, ...HEADER_STYLE })),
    ...options.rows.map((row) => options.columns.map((c) => c.cell(row))),
  ];

  const summary: SheetData = [
    [
      { value: 'Параметр', ...HEADER_STYLE },
      { value: 'Значение', ...HEADER_STYLE },
    ],
    ...options.summary.map(([name, value]) => [{ value: name, fontWeight: 'bold' as const }, value]),
  ];

  await writeXlsxFile([
    {
      data,
      sheet: options.sheetName,
      columns: options.columns.map((c) => ({ width: c.width })),
      stickyRowsCount: 1,
    },
    {
      data: summary,
      sheet: 'Фильтры',
      columns: [{ width: 22 }, { width: 70 }],
    },
  ]).toFile(options.fileName);
}
