'use strict';

angular.module('app').controller('UploaderCtrl', ['$scope', '$http', '$sce', 'User', function($scope, $http, $sce, user) {

    var note = 'Please select a CSV or XML file';

    $scope.user = user;

    $scope.uploader = {};
    $scope.uploader.filename = '';
    $scope.uploader.filesize = '';

    $scope.importer = {};
    $scope.importer.directory = '';
    $scope.importer.element = '';
    $scope.importer.uri_id = '';
    $scope.importer.fields = [];

    $scope.show_upload_button = false;
    $scope.show_import_form = false;
    $scope.note = note;

    $scope.remover = {};
    $scope.remover.directory = '';
    $scope.remover.loading = false;

    $scope.data = {};
    $scope.data.fields = {};
    $scope.data.indexes = [];
    $scope.data.needsRefresh = true;

    $scope.showIndexes = function() {
        var indexes = {
            indexes: $scope.data.indexes
        };
        return JSON.stringify(indexes, null, 2);
    };

    $scope.onFileSelected = function(files) {
        var file = files[0];

        $scope.data.fields = {};

        $scope.show_import_form = false;
        $scope.uploader.filename = file.name;
        $scope.uploader.filesize = file.size + ' bytes';

        $scope.clearMessage();

        var extension = MarkLogic.Util.getFileExtension($scope.uploader.filename);
        if (extension === 'csv' || extension === 'xml') {
            $scope.show_upload_button = true;
            $scope.note = $scope.uploader.filename + ' ' + $scope.uploader.filesize;
        } else {
            $scope.show_upload_button = false;
            $scope.note = note;
        }

        $scope.$apply();
    };

    $scope.uploadFile = function() {
        MarkLogic.Util.showLoader();
        jQuery('#uploadForm').ajaxForm({
            beforeSerialize: function($form, options) {
                if ($scope.uploader.filename === '') {
                    $scope.showMessage(note);
                    return false; // cancel submit
                } else {
                    var extension = MarkLogic.Util.getFileExtension($scope.uploader.filename);
                    if (extension !== 'csv' && extension !== 'xml') {
                        $scope.showMessage(note);
                        return false; // cancel submit
                    }
                }
            },
            dataType: 'json',
            uploadProgress: function(event, position, total, percentComplete) {
                var percentVal = 'Upload in Progress ' + percentComplete + '%';
                $scope.showMessage(percentVal + ' ' + percentVal);

                $scope.$apply();
            },
            success: function(data) {
                MarkLogic.Util.hideLoader();
                $scope.showMessage(data.message);

                if (data.success) {
                    $scope.show_upload_button = false;

                    angular.copy(data.importer, $scope.importer);
                    $scope.show_import_form = true;

                    $scope.data.fields = {};
                    $scope.importer.fields.forEach(function(field) {
                        $scope.data.fields[field] = {type: 'element'};
                    });

                    $scope.data.indexes = [];
                    var existingIndexes = $scope.importer.indexes['range-element-index'];
                    if (existingIndexes) {
                        var positions = [];
                        for (var i = 0; i < existingIndexes.length; i++) {
                            var existingIndex = existingIndexes[i];
                            var name = existingIndex['localname'];

                            if ($scope.data.fields[name]) {
                                var type = existingIndex['scalar-type'];
                                var indexObj = {};
                                indexObj[type] = {
                                    field: name,
                                    value: existingIndex['namespace-uri']
                                };
                                $scope.data.indexes.push(indexObj);

                                positions.push(i);
                            }
                        }
                        positions.forEach(function(position) {
                            existingIndexes.splice(position, 1);
                        });
                    }

                    $scope.data.needsRefresh = true;

                    $scope.$apply();
                }
            },
            error: function(xhr, textStatus, errorThrown) {
                MarkLogic.Util.hideLoader();
                $scope.showMessage(textStatus + ': ' + errorThrown);
            }
        });
    };

    $scope.importFile = function() {
        var existingIndexes = $scope.importer.indexes['range-element-index'];
        var newIndexes = [];

        $scope.data.indexes.forEach(function(index) {
            var scalarType = Object.keys(index)[0];
            var value = index[scalarType];
            var rangeElementIndex = {
                'scalar-type': scalarType,
                'namespace-uri': '',
                'localname': value.field,
                'collation': '',
                'range-value-positions': false,
                'invalid-values': 'reject'
            };

            if (value.value) {
                rangeElementIndex['namespace-uri'] = value.value;
            }

            if (scalarType === 'string') {
                rangeElementIndex['collation'] = 'http://marklogic.com/collation/codepoint';
            }

            newIndexes.push(rangeElementIndex);
        });
        // Add the newly defined indexes to the list
        var mergedIndexes = existingIndexes.concat(newIndexes);
        $scope.importer.indexes = {
            'range-element-index': mergedIndexes
        };

        MarkLogic.Util.showLoader();
        $http.post('/api/mlcp/load', $scope.importer).then(function(response) {
            MarkLogic.Util.hideLoader();
            $scope.showMessage(response.data.message);
        });
    };

    $scope.clearMessage = function() {
        $scope.showMessage('');
    };

    $scope.showMessage = function(message) {
        $scope.message = message;
    };

    $scope.trustAsHtml = function(text) {
        return $sce.trustAsHtml(text);
    };

    $scope.removeAll = function() {
        $scope.remover.loading = true;
        var data = { directory: $scope.remover.directory };
        $http.post('/api/mlcp/remove', data).then(function(response) {
            $scope.remover.loading = false;
        });
    };

    $scope.showUriID = function() {
        console.log($scope.importer.uri_id);
    };

}]);

//Please confirm that you want to remove the range element index:
//[string] :eyeColor
