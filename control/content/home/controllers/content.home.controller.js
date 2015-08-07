'use strict';

(function (angular, window) {
    angular
        .module('peoplePluginContent')
        .controller('ContentHomeCtrl', ['$scope', '$window', '$modal', 'Buildfire', 'FormatConverter', 'TAG_NAMES', 'ERROR_CODE', 'RankOfLastItem',
            function ($scope, $window, $modal, Buildfire, FormatConverter, TAG_NAMES, ERROR_CODE, RankOfLastItem) {
                /**
                 * These are the options available to sort people list.
                 * */
                var MANUALLY = 'Manually',
                    OLDEST_TO_NEWEST = 'Oldest to Newest',
                    NEWEST_TO_OLDEST = 'Newest to Oldest',
                    FIRST_NAME_A_TO_Z = 'First Name A-Z',
                    FIRST_NAME_Z_TO_A = 'First Name Z-A',
                    LAST_NAME_A_TO_Z = 'Last Name A-Z',
                    LAST_NAME_Z_TO_A = 'Last Name Z-A',

                    /**
                     * _pageSize used to specify number of records per page.
                     * _page used to specify nextPageToken.
                     * @type {number}
                     * @private
                     */
                    _pageSize = 10,
                    _page = 0,

                    /**
                     * SearchOptions are using for searching , sorting people and fetching people list
                     * @type object
                     */
                    searchOptions = {
                        filter: {"$json.fName": {"$regex": '/*'}}, page: _page, pageSize: _pageSize + 1 // the plus one is to check if there are any more
                    };

                var ContentHome = this;

                /**
                 * ContentHome.busy used to enable/disable infiniteScroll. if busy true it means there is not more data.
                 * @type {boolean}
                 */
                ContentHome.busy = false;


                /**
                 * ContentHome.items used to store the people list which fetched from server.
                 * @type {null}
                 */
                ContentHome.items = null;

                /**
                 * ContentHome.data used to store PeopleInfo which fetched from server.
                 * @type {null}
                 */
                ContentHome.data = null;

                /**
                 * ContentHome.sortingOptions are used to show options in Sort Items drop-down menu in home.html.
                 * @type {*[]}
                 */
                ContentHome.sortingOptions = [
                    MANUALLY,
                    OLDEST_TO_NEWEST,
                    NEWEST_TO_OLDEST,
                    FIRST_NAME_A_TO_Z,
                    FIRST_NAME_Z_TO_A,
                    LAST_NAME_A_TO_Z,
                    LAST_NAME_Z_TO_A
                ];

                /**
                 * ContentHome.imageSortableOptions used for ui-sortable directory to drag-drop carousel images Manually.
                 * @type object
                 */
                ContentHome.imageSortableOptions = {
                    handle: '> .cursor-grab'
                };

                /**
                 * ContentHome.itemSortableOptions used for ui-sortable directory to sort people listing Manually.
                 * @type object
                 */
                ContentHome.itemSortableOptions = {
                    handle: '> .cursor-grab',
                    disabled: true,
                    stop: function (e, ui) {
                        var endIndex = ui.item.sortable.dropindex,
                            maxRank = 0,
                            draggedItem = ContentHome.items[endIndex];

                        if (draggedItem) {
                            var prev = ContentHome.items[endIndex - 1],
                                next = ContentHome.items[endIndex + 1];
                            var isRankChanged = false;
                            if (next) {
                                if (prev) {
                                    draggedItem.data.rank = ((prev.data.rank || 0) + (next.data.rank || 0)) / 2;
                                    isRankChanged = true;
                                } else {
                                    draggedItem.data.rank = (next.data.rank || 0) / 2;
                                    isRankChanged = true;
                                }
                            } else {
                                if (prev) {
                                    draggedItem.data.rank = (((prev.data.rank || 0) * 2) + 10) / 2;
                                    maxRank = draggedItem.data.rank;
                                    isRankChanged = true;
                                }
                            }
                            if (isRankChanged) {
                                Buildfire.datastore.update(draggedItem.id, draggedItem.data, TAG_NAMES.PEOPLE, function (err) {
                                    if (err) {
                                        console.error('Error during updating rank');
                                    } else {
                                        if (ContentHome.data.content.rankOfLastItem < maxRank) {
                                            ContentHome.data.content.rankOfLastItem = maxRank;
                                            RankOfLastItem.setRank(maxRank);
                                        }
                                    }
                                })
                            }
                        }
                    }
                };

                ContentHome.DeepLinkCopyUrl = false;

                /**
                 * tmrDelayForPeopleInfo is used to update peopleInfo after given time in setTimeOut.
                 * @type {null}
                 */
                var tmrDelayForPeopleInfo = null;

                /**
                 * Default peopleInfo data json
                 * @type object
                 * @private
                 */
                var _data = {
                    content: {
                        images: [],
                        description: '',
                        sortBy: '',
                        rankOfLastItem: 0
                    },
                    design: {
                        listLayout: '',
                        itemLayout: '',
                        backgroundImage: ''
                    }
                };

                /**
                 * saveData(newObj, tag) used to save a new record in datastore.
                 * @param newObj is a new/modified object.
                 * @param tag is a tag name or identity given to the data json during saving the record.
                 */
                var saveData = function (newObj, tag) {
                    if (newObj == undefined)return;
                    result.obj.content.rankOfLastItem = result.obj.content.rankOfLastItem || 0;
                    Buildfire.datastore.save(newObj, tag, function (err, result) {
                        if (err || !result) {
                            console.error('------------error saveData-------', err);
                        }
                        else {
                            console.log('------------data saved-------', result);
                            RankOfLastItem.setRank(result.obj.content.rankOfLastItem);
                        }
                    });
                };

                /**
                 * getSearchOptions(value) is used to get searchOptions with one more key sort which decide the order of sorting.
                 * @param value is used to filter sort option.
                 * @returns object
                 */
                var getSearchOptions = function (value) {
                    ContentHome.itemSortableOptions.disabled = true;
                    switch (value) {
                        case OLDEST_TO_NEWEST:
                            searchOptions.sort = {"dateCreated": 1};
                            break;
                        case NEWEST_TO_OLDEST:
                            searchOptions.sort = {"dateCreated": -1};
                            break;
                        case FIRST_NAME_A_TO_Z:
                            searchOptions.sort = {"fName": 1};
                            break;
                        case FIRST_NAME_Z_TO_A:
                            searchOptions.sort = {"fName": -1};
                            break;
                        case LAST_NAME_A_TO_Z:
                            searchOptions.sort = {"lName": 1};
                            break;
                        case LAST_NAME_Z_TO_A:
                            searchOptions.sort = {"lName": -1};
                            break;
                        default :
                            ContentHome.itemSortableOptions.disabled = false;
                            searchOptions.sort = {"rank": 1};
                            break;
                    }
                    return searchOptions;
                };

                /**
                 * ContentHome.loadMore() called by infiniteScroll to implement lazy loading
                 */
                ContentHome.loadMore = function () {
                    if (ContentHome.busy) {
                        return;
                    }
                    ContentHome.busy = true;
                    if (ContentHome.data && ContentHome.data.content.sortBy) {
                        searchOptions = getSearchOptions(ContentHome.data.content.sortBy);
                    }

                    Buildfire.datastore.search(searchOptions, TAG_NAMES.PEOPLE, function (err, result) {
                        if (err) {
                            console.error('-----------err in getting list-------------', err);
                        }
                        else {
                            if (result.length > _pageSize) {// to indicate there are more
                                result.pop();
                                searchOptions.page = searchOptions.page + 1;
                                ContentHome.busy = false;
                            }
                            ContentHome.items = ContentHome.items ? ContentHome.items.concat(result) : result;
                            $scope.$digest();
                        }
                    });
                };
                var getContentPeopleInfo = function () {
                    Buildfire.datastore.get(TAG_NAMES.PEOPLE_INFO, function (err, result) {
                        if (err && err.code !== ERROR_CODE.NOT_FOUND) {
                            console.error('-----------err-------------', err);
                        }
                        else if (err && err.code === ERROR_CODE.NOT_FOUND) {
                            saveData(JSON.parse(angular.toJson(_data)), TAG_NAMES.PEOPLE_INFO);
                        }
                        else if (result) {
                            ContentHome.data = result.data;
                            ContentHome.data.content.rankOfLastItem = ContentHome.data.content.rankOfLastItem || 0;
                            RankOfLastItem.setRank(ContentHome.data.content.rankOfLastItem);
                            if (!ContentHome.data.content.sortBy) {
                                ContentHome.data.content.sortBy = MANUALLY;
                            }
                            ContentHome.itemSortableOptions.disabled = !(ContentHome.data.content.sortBy === MANUALLY);
                            $scope.$digest();
                            if (tmrDelayForPeopleInfo)clearTimeout(tmrDelayForPeopleInfo);
                        }
                    });
                };
                getContentPeopleInfo();
                ContentHome.openDeepLinkDialog = function () {
                    ContentHome.DeepLinkCopyUrl = true;
                    setTimeout(function () {
                        ContentHome.DeepLinkCopyUrl = false;
                        $scope.$apply();
                    }, 1500);
                };
                ContentHome.openImportCSVDialog = function () {
                    var modalInstance = $modal
                        .open({
                            templateUrl: 'home/modals/import-csv.html',
                            controller: 'ImportCSVPopupCtrl',
                            controllerAs: 'ImportCSVPopup',
                            size: 'sm'
                        });
                    modalInstance.result.then(function (data) {
                        console.log('Data----------', data);
                    }, function (data) {
                        if (data) {
                            console.log('Data----------', data);

                        }
                    });
                };
                ContentHome.exportCSV = function () {
                    if (ContentHome.items) {
                        var tempData = [];
                        angular.forEach(angular.copy(ContentHome.items), function (value) {
                            delete value.data.dateCreated;
                            tempData.push(value.data);
                        });
                        var json = JSON.parse(angular.toJson(tempData));
                        var csv = FormatConverter.JSON2CSV(json);
                        var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
                        if (navigator.msSaveBlob) {  // IE 10+
                            navigator.msSaveBlob(blob, "Items.csv");
                        }
                        else {
                            var link = document.createElement("a");
                            if (link.download !== undefined) {
                                var url = URL.createObjectURL(blob);
                                link.setAttribute("href", url);
                                link.setAttribute("download", "MyData.csv");
                                link.style.visibility = 'hidden';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                            }
                        }
                    }
                };
                ContentHome.getTemplate = function () {
                    var tempData = [{
                        topImage: null,
                        iconImage: null,
                        fName: null,
                        lName: null,
                        position: null,
                        deepLinkUrl: null,
                        socailLinks: null,
                        bodyContent: null,
                        indexToken: null
                    }];
                    var json = JSON.parse(angular.toJson(tempData));
                    var csv = FormatConverter.JSON2CSV(json);
                    $window.open("data:text/csv;charset=utf-8," + escape(csv))
                };

                ContentHome.removeListItem = function (_index, itemId) {

                    var modalInstance = $modal
                        .open({
                            templateUrl: 'home/modals/remove-people.html',
                            controller: 'RemovePeoplePopupCtrl',
                            controllerAs: 'RemovePeoplePopup',
                            size: 'sm',
                            resolve: {
                                peopleInfo: function () {
                                    return ContentHome.items[_index];
                                }
                            }
                        });
                    modalInstance.result.then(function (message) {
                        if (message === 'yes') {
                            var item = ContentHome.items[_index];
                            Buildfire.datastore.delete(item.id, TAG_NAMES.PEOPLE, function (err, result) {
                                if (err)
                                    return;
                                ContentHome.items.splice(_index, 1);
                                $scope.$digest();
                            });
                        }
                    }, function (data) {

                    });
                };

                ContentHome.searchListItem = function (value) {
                    var fullName = '';
                    if (value) {
                        if (value.indexOf(' ') !== -1) {
                            fullName = value.trim().split(' ');
                            searchOptions.filter = {"$or": [{"$json.fName": fullName[0]}, {"$json.lName": fullName[1]}]};
                        } else {
                            fullName = value.trim();
                            searchOptions.filter = {"$or": [{"$json.fName": fullName}, {"$json.lName": fullName}]};
                        }
                        Buildfire.datastore.search(searchOptions, TAG_NAMES.PEOPLE, function (err, records) {
                            if (err)
                                console.error('There was a problem retrieving your data', err);
                            else {
                                ContentHome.items = records;
                                $scope.$digest();
                            }
                        });
                    } else {
                        console.error('Blank name provided');
                    }
                };

                ContentHome.sortPeopleBy = function (value) {
                    if (!value) {
                        console.error('There was a problem sorting your data');
                    } else {
                        ContentHome.items = null;
                        searchOptions.page = 0;
                        ContentHome.busy = false;
                        ContentHome.data.content.sortBy = value;
                        ContentHome.loadMore();
                    }
                };

                ContentHome.openAddCarouselImagePopup = function () {
                    var modalInstance = $modal
                        .open({
                            templateUrl: 'home/modals/add-carousel-image.html',
                            controller: 'AddCarouselImagePopupCtrl',
                            controllerAs: 'AddCarouselImagePopup',
                            size: 'sm'
                        });
                    modalInstance.result.then(function (imageInfo) {
                        if (imageInfo && ContentHome.data) {
                            ContentHome.data.content.images.push(JSON.parse(angular.toJson(imageInfo)));
                        } else {
                            console.error('Unable to load data.')
                        }
                    }, function (err) {
                        if (err) {
                            console.error('Error:', err)
                        }
                    });
                };

                ContentHome.openAddImageLinkPopup = function (_index) {
                    var modalInstance = $modal
                        .open({
                            templateUrl: 'home/modals/add-image-link.html',
                            controller: 'AddImageLinkPopupCtrl',
                            controllerAs: 'AddImageLinkPopup',
                            size: 'sm'
                        });
                    modalInstance.result.then(function (_link) {
                        if (_link && ContentHome.data) {
                            ContentHome.data.content.images[_index].link = _link;
                        } else {
                            console.error('Unable to load data.')
                        }
                    }, function (err) {
                        if (err) {
                            console.error('Error:', err)
                        }
                    });
                };

                ContentHome.removeCarouselImage = function ($index) {
                    var modalInstance = $modal
                        .open({
                            templateUrl: 'home/modals/remove-image-link.html',
                            controller: 'RemoveImagePopupCtrl',
                            controllerAs: 'RemoveImagePopup',
                            size: 'sm',
                            resolve: {
                                imageInfo: function () {
                                    return ContentHome.data.content.images[$index]
                                }
                            }
                        });
                    modalInstance.result.then(function (data) {
                        if (data)
                            ContentHome.data.content.images.splice($index, 1);
                    }, function (data) {
                        if (data) {
                            console.error('Error----------while removing image----', data)
                        }
                    });
                };

                Buildfire.datastore.onUpdate(function (event) {
                    if (event && event.tag === TAG_NAMES.PEOPLE_INFO) {
                        ContentHome.data = event.obj;
                        $scope.$digest();
                        if (tmrDelayForPeopleInfo)clearTimeout(tmrDelayForPeopleInfo);
                    }
                });

                var saveDataWithDelay = function (infoData) {
                    if (infoData) {
                        if (tmrDelayForPeopleInfo) {
                            clearTimeout(tmrDelayForPeopleInfo);
                        }
                        tmrDelayForPeopleInfo = setTimeout(function () {
                            saveData(JSON.parse(angular.toJson(infoData)), TAG_NAMES.PEOPLE_INFO);
                        }, 500);
                    }
                };

                $scope.$watch(function () {
                    return ContentHome.data;
                }, saveDataWithDelay, true);

            }])
})(window.angular, window);
