////////////////////////////////////////////////////////////////////////////////

'use strict';

const BoxApi = require('./boxapi'),
    BoxOAuth = require('./boxoauth'),
    config = require('./../../lib/config'),
    logger = require('./../../lib/logger');

const useServerToken = true;

const namesToDelete = ['collaboration-test'];

// top level folder to start
const parentFolderId = 0;
const keepMatchedFolder = false;

const jwt_app = 'jwt_app';
config.box.jwt_app = config.box[jwt_app] || config.box.jwt_app;
let boxapi = new BoxApi(config.box);

let oauthapp = config.box.oauth_app;

const removeFolderItems = fid => {
    return boxapi.getFolderItems(fid, 'id,name').then(res => {
        let folderRes = JSON.parse(res.body);
        let p_all = [];

        folderRes.entries
            .filter(item => item.type === 'folder')
            .forEach(item => {
                let p = boxapi.deleteFolder(item.id, true).then(() => {
                    logger.log(
                        'info',
                        `folder [${item.id}] with name [${item.name}] has been deleted.`
                    );
                });

                p_all.push(p);
            });

        folderRes.entries.filter(item => item.type === 'file').forEach(item => {
            let p = boxapi.deleteFile(item.id).then(() => {
                logger.log(
                    'info',
                    `file [${item.id}] with name [${item.name}] has been deleted.`
                );
            });

            p_all.push(p);
        });

        return Promise.all(p_all).then(() => {
            if (p_all.length > 0 && folderRes.total_count > 1) {
                return removeFolderItems(fid);
            }
        });
    });
};

const removeFolders = () => {
    return boxapi.getFolderItems(parentFolderId, 'id,name').then(res => {
        if (res.statusCode !== 200) {
            throw new Error(
                `failed to create test folder with response => ${JSON.stringify(
                    res
                )}`
            );
        }

        let folderRes = JSON.parse(res.body);
        logger.log('info', `[${folderRes.total_count}] returned`);

        return Promise.all(
            folderRes.entries
                .filter(item => {
                    return namesToDelete.some(name =>
                        item.name.startsWith(name)
                    );
                })
                .map(
                    item =>
                        keepMatchedFolder
                            ? removeFolderItems(item.id)
                            : boxapi.deleteFolder(item.id, true)
                )
        );
    });
};

/////////////////////////////////////////////////////////////////////////////////
// Usage: configure the oauth_app in config.yml so you have a user that can be
// used to do the cleanup operations.
// Then you need to pass the parentFolderId for the folder to be cleaned up, if
// it's under root folder, just pass `0`. And then add all of the folder names
// to `namesToDelete` array
/////////////////////////////////////////////////////////////////////////////////

if (useServerToken) {
    boxapi.getServerToken().then(() => removeFolders());
} else {
    BoxOAuth(oauthapp.redirect_url, oauthapp.user, oauthapp.password)
        .then(params => {
            return boxapi.requestAccessToken(params.oauth_code);
        })
        .then(() => {
            return removeFolders();
        })
        .then(() => {
            logger.log('info', 'All Done!');
        })
        .catch(error => {
            logger.log('error', 'error occurred!!', error);
        });
}
