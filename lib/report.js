'use strict';

const logger = require('./logger'),
    fs = require('fs-extra'),
    Excel = require('exceljs'),
    utils = require('./utils');

/**
 * Some helpful information about the rules of worksheet names
 * credit: https://github.com/SheetJS/js-xlsx/issues/376
 *
 * Here are the "rules":

 * bad characters: : \ / ? * [ ]
 * length: 0 < length < 32
 * Characters apparently can be encoded with the _xHHHH_ form, so it's possible to make a sheet with a newline character! However, the length only applies to the decoded characters, so a name like
 * 1234567890
 * 1234567890
 * 123456789
 * can be encoded as 1234567890_x000d_1234567890_x000d_123456789
* 
 * So definitely js-xlsx should do something. It's unclear to me how far it should go.
* 
 * js-xlsx definitely should encode/decode the tab names, so the JS interface works with JS strings and the XLSX writer/reader interface with the encoded values.
* 
 * I am not sure how js-xlsx should handle invalid names. Should it
* 
 * A) throw an error (something about an invalid sheet name)
* 
 * B) try to "fix" the name by replacing bad characters
* 
 * Related to this is duplicated SheetNames entries. If a name shows up twice in the SheetNames array (like ["Sheet1", "Sheet2", "Sheet2"]) how should it be handled?
 */

/**
 * Generate report in Excel format
 * expected data format:
 * [
 *    {'name': sheet1', 'headers': [{'name': '', 'key': ''}], data: [{}, {}, ...]},
 *    {'name': sheet2', 'headers': [], data: [{}, {}, ...]},
 *    {'name': sheet3', 'headers': [], data: [{}, {}, ...]},
 *     ... ...
 * ]
 * 
 * The chart value can be found in https://msdn.microsoft.com/en-us/library/system.windows.media.colors.aspx
 */
module.exports = class ExcelReport {
    constructor(params) {
        Object.assign(this, params);
        this.workbook = new Excel.Workbook();

        this.headerStyle = this.headerStyle || {
            name: 'Arial Black',
            color: {
                argb: 'FFC71585'
            },
            family: 4,
            size: 12,
            underline: 'double',
            bold: true
        };

        this.workdata = this.workdata || [];
        this.workdata.forEach(sheetData => {
            utils.mixin(sheetData, {
                columns: this.defaultColumns,
                data: []
            });
        });
    }

    addSheetData(sheetData) {
        if (!sheetData || !sheetData.name) {
            throw new Error('sheetdata or sheetdata.name can not be null');
        }
        this.workdata.push(sheetData);
        utils.mixin(sheetData, {
            columns: this.defaultColumns,
            data: []
        });
    }
    addRow(sheet, row) {
        let sheetData = this.workdata.find(item => item.name === sheet);
        if (!sheetData) {
            sheetData = {
                name: sheet,
                columns: this.defaultColumns,
                data: [row]
            };
            this.workdata.push(sheetData);
        } else {
            sheetData.data.push(row);
        }
    }

    populateData() {
        this.workdata.forEach(sheetData => {
            let worksheet = this.workbook.getWorksheet(sheetData.name)
             || this.workbook.addWorksheet(sheetData.name);

            worksheet.columns = sheetData.columns;

            sheetData.data.forEach((row, rdx) => {
                worksheet.addRow(row).commit();
                if (this.rowStyleMap) {
                    worksheet.getRow(rdx + 2).font = this.rowStyleMap[
                        row.source
                    ];
                }
            });
            worksheet.getRow(1).font = this.headerStyle;
        });
    }

    save() {
        if (this.append && fs.existsSync(this.filename)) {
            return this.workbook.xlsx
                .readFile(this.filename)
                .then(() => {
                    return this.populateData();
                })
                .then(() => {
                    return this.workbook.xlsx.writeFile(this.filename);
                });
        } else {
            this.populateData();
            return this.workbook.xlsx.writeFile(this.filename);
        }
    }
};
