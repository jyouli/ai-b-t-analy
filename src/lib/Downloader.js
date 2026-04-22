import fetch from 'dva/fetch';
import fileOxs from 'src/lib/fileOxs';

class Downloader {
    constructor() {
        this.protocol = location.protocol + '//';
        this.origin = location.host;
    }

    checkFileType = fileName => {
        //支持文件水印的文件类型
        let match = /\.([a-zA-Z]*)$/.exec(fileName);
        let suffix = (match && match[1]) || '';
        return ['pdf', 'jpg', 'jpeg', 'png', 'PNG', 'JPG', 'JPEG', 'PDF'].includes(suffix);
    };

    open = (files) => {
        if (!this.isArray(files)) files = [files];
        files.map(file => {
            let fileObj = typeof file === 'object' ? file : { filePath: file };
            this.downloadHandler(fileObj);
        });
    };

    buildBatchDownloadFiles = (value) => {
        return (value || [])
            .filter(item => item?.url)
            .map(item => {
                return {
                    filePath: fileOxs.signFile(item.url, item.name, 'download'),
                    fileDesc: item.name || this.getFileDescByUrl(item.url),
                };
            });
    };

    openBatchDownload = (value) => {
        const files = this.buildBatchDownloadFiles(value);
        this.open(files);
    };

    downloadHandler = async (fileObj) => {
        // 跨域判断：如果支持跨域下载，通过跨域iframe实现；如果不支持跨域下载，统一使用a标签的方式
        // 非跨域时：依据download支持情况选择不同的下载方式，（同域或base64编码）
        if (!fileObj.filePath) {
            return;
        }
        if (!fileObj.fileDesc) {
            fileObj.fileDesc = this.getFileDescByUrl(fileObj.filePath);
        }
        let isData = fileObj.filePath.slice(0, 5) === 'data:',
            isH5Support = this.isH5Support(),
            filePath = isData ? fileObj.filePath : this.httpConvert(fileObj.filePath);
        const { downloadUrl, isCrossOrigin } = this.getCrossOrigin(filePath);
        if (isCrossOrigin && downloadUrl && !isData) {
            this.iframeCrossOrigin(fileObj.fileDesc, filePath, downloadUrl);
        } else {
            // 非跨域 | 跨域：不可跨域
            isH5Support ? await this.h5Download2(fileObj.fileDesc, filePath, false) : this.iframeDownload(fileObj.fileDesc, filePath);
        }
    };

    getCrossOrigin = url => {
        if (this.origin.includes('localhost') || url.includes('minio.cloud.hecom.cn') || url.includes('hw')) {
            return { downloadUrl: '', isCrossOrigin: false };
        }
        let urlArr = url.split('://'),
            downloadUrl = '',
            isCrossOrigin = false;
        if (urlArr[1]) {
            let pathArr = urlArr[1].split('?'),
                originArr = pathArr[0].split('/'),
                origin = originArr[0];
            isCrossOrigin = this.origin === origin ? false : true;
            if (isCrossOrigin) {
                if (origin.indexOf('cloud.hecom.cn') !== -1) {
                    downloadUrl = urlArr[0] + '://' + origin + '/cors_download.html';
                }
            }
        }
        return {
            downloadUrl,
            isCrossOrigin,
        };
    };

    getFileDescByUrl = url => {
        return url.lastIndexOf('/') > -1 ? url.slice(url.lastIndexOf('/') + 1) : url;
    };

    isH5Support = () => {
        return 'download' in document.createElement('a');
    };

    isArray = obj => {
        return Object.prototype.toString.call(obj) == '[object Array]';
    };

    httpConvert = url => {
        if (url.indexOf('http') !== 0) {
            // url地址没有http头时，自动添加
            url = this.protocol + url;
        } else if (this.protocol == 'https://' && url.indexOf('http://') === 0) {
            url = url.replace(/http:/, 'https:'); // https下只能发起https请求
        }

        const fileArr = url.split('/');
        const fileName = fileArr[fileArr.length - 1];
        //fileArr[fileArr.length - 1] = encodeURIComponent(fileName);
        fileArr[fileArr.length - 1] = fileName;
        return fileArr.join('/');
    };
    h5Download = (fileDesc, filePath, isData) => {
        // 后缀名
        let downEl = document.createElement('a'),
            evtObj = document.createEvent('MouseEvents');
        evtObj.initMouseEvent('click', false, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        downEl.download = fileDesc;
        downEl.href = isData ? URL.createObjectURL(new Blob([filePath])) : filePath;
        downEl.dispatchEvent(evtObj);
        setTimeout(() => {
            isData && URL.revokeObjectURL(downEl.href);
        }, 100);
    };

    h5Download2 = async (fileDesc, filePath) => {
        return fetch(filePath)
            .then(response => response.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(new Blob([blob]));
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileDesc;
                document.body.appendChild(link);
                link.click();
                URL.revokeObjectURL(blobUrl);
                link.remove();
            })
            .catch(error => {
                this.h5Download(fileDesc, filePath);
                console.error('下载文件时出错:', error);
            });
    };

    iframeDownload = (fileDesc, filePath) => {
        let isDataImg = filePath.slice(0, 10) === 'data:image',
            ifr = document.createElement('iframe');

        ifr.style.width = 0;
        ifr.style.height = 0;
        ifr.src = filePath;
        ifr.onload = function () {
            try {
                isDataImg && ifr.contentWindow.document.write("<img src='" + filePath + "' />");
                ifr.contentWindow.document.execCommand('SaveAs', false, fileDesc);
            } catch (e) {
                console.log(e);
            }
            setTimeout(function () {
                document.body.removeChild(ifr);
            }, 10000);
        };
        document.body.appendChild(ifr);
    };

    iframeCrossOrigin = (fileDesc, filePath, downloadUrl) => {
        let ifr = document.createElement('iframe');
        ifr.style.width = 0;
        ifr.style.height = 0;
        ifr.src = `${downloadUrl}?filePath=${filePath}&fileDesc=${fileDesc}`;
        ifr.onload = function () {
            setTimeout(function () {
                document.body.removeChild(ifr);
            }, 10000);
        };
        document.body.appendChild(ifr);
    };
}

export default new Downloader();
