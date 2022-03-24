{% load i18n %}

/* globals
    attachSelect,
    closeModal,
    inventreeGet,
    makeOptionsList,
    modalEnable,
    modalSetContent,
    modalSetTitle,
    modalSubmit,
    openModal,
    showAlertDialog,
*/

/* exported
    printPartLabels,
    printStockItemLabels,
    printStockLocationLabels,
*/

function printStockItemLabels(items) {
    /**
     * Print stock item labels for the given stock items
     */

    if (items.length == 0) {
        showAlertDialog(
            '{% trans "Select Stock Items" %}',
            '{% trans "Stock item(s) must be selected before printing labels" %}'
        );

        return;
    }

    // Request available labels from the server
    inventreeGet(
        '{% url "api-stockitem-label-list" %}',
        {
            enabled: true,
            items: items,
        },
        {
            success: function(response) {

                if (response.length == 0) {
                    showAlertDialog(
                        '{% trans "No Labels Found" %}',
                        '{% trans "No labels found which match selected stock item(s)" %}',
                    );

                    return;
                }

                // Select label to print
                selectLabel(
                    response,
                    items,
                    {
                        success: function(data) {

                            var pk = data.label;

                            var href = `/api/label/stock/${pk}/print/?`;

                            items.forEach(function(item) {
                                href += `items[]=${item}&`;
                            });

                            if (data.plugin) {
                                href += `plugin=${data.plugin}`;
                            }

                            window.location.href = href;
                        }
                    }
                );
            }
        }
    );
}

function printStockLocationLabels(locations) {

    if (locations.length == 0) {
        showAlertDialog(
            '{% trans "Select Stock Locations" %}',
            '{% trans "Stock location(s) must be selected before printing labels" %}'
        );

        return;
    }

    // Request available labels from the server
    inventreeGet(
        '{% url "api-stocklocation-label-list" %}',
        {
            enabled: true,
            locations: locations,
        },
        {
            success: function(response) {
                if (response.length == 0) {
                    showAlertDialog(
                        '{% trans "No Labels Found" %}',
                        '{% trans "No labels found which match selected stock location(s)" %}',
                    );

                    return;
                }

                // Select label to print
                selectLabel(
                    response,
                    locations,
                    {
                        success: function(data) {

                            var pk = data.label;

                            var href = `/api/label/location/${pk}/print/?`;

                            locations.forEach(function(location) {
                                href += `locations[]=${location}&`;
                            });

                            if (data.plugin) {
                                href += `plugin=${data.plugin}`;
                            }

                            window.location.href = href;
                        }
                    }
                );
            }
        }
    );
}


function printPartLabels(parts) {
    /**
     * Print labels for the provided parts
     */

    if (parts.length == 0) {
        showAlertDialog(
            '{% trans "Select Parts" %}',
            '{% trans "Part(s) must be selected before printing labels" %}',
        );

        return;
    }

    // Request available labels from the server
    inventreeGet(
        '{% url "api-part-label-list" %}',
        {
            enabled: true,
            parts: parts,
        },
        {
            success: function(response) {

                if (response.length == 0) {
                    showAlertDialog(
                        '{% trans "No Labels Found" %}',
                        '{% trans "No labels found which match the selected part(s)" %}',
                    );

                    return;
                }

                // Select label to print
                selectLabel(
                    response,
                    parts,
                    {
                        success: function(data) {

                            var pk = data.label;

                            var url = `/api/label/part/${pk}/print/?`;

                            parts.forEach(function(part) {
                                url += `parts[]=${part}&`;
                            });

                            if (data.plugin) {
                                href += `plugin=${data.plugin}`;
                            }

                            window.location.href = url;
                        }
                    }
                );
            }
        }
    );
}


function selectLabel(labels, items, options={}) {
    /**
     * Present the user with the available labels,
     * and allow them to select which label to print.
     * 
     * The intent is that the available labels have been requested
     * (via AJAX) from the server.
     */

    // Array of available plugins for label printing
    var plugins = [];

    // Request a list of available label printing plugins from the server
    inventreeGet(
        '{% url "api-plugin-list" %}',
        {

        },
        {
            async: false,
            success: function(response) {
                response.forEach(function(plugin) {
                    // Look for active plugins which implement the 'labels' mixin class
                    if (plugin.active && plugin.mixins && plugin.mixins.labels) {
                        // This plugin supports label printing
                        plugins.push(plugin);
                    }
                });
            }
        }
    );

    var plugin_selection = '';
    
    
    if (plugins.length > 0) {
        plugin_selection =`
        <div class='form-group'>
            <label class='control-label requiredField' for='id_plugin'>
            {% trans "Select Printer" %}
            </label>
            <div class='controls'>
                <select id='id_plugin' class='select form-control' name='plugin'>
                    <option value='' title='{% trans "Export to PDF" %}'>{% trans "Export to PDF" %}</option>
        `;

        plugins.forEach(function(plugin) {
            plugin_selection += `<option value='${plugin.key}' title='${plugin.meta.human_name}'>${plugin.meta.description} - <small>${plugin.meta.human_name}</small></option>`;
        });

        plugin_selection += `
                    </select>
                </div>
            </div>
        `;
    }

    var modal = options.modal || '#modal-form';

    var label_list = makeOptionsList(
        labels,
        function(item) {
            var text = item.name;

            if (item.description) {
                text += ` - ${item.description}`;
            }

            return text;
        },
        function(item) {
            return item.pk;
        }
    );

    // Construct form
    var html = '';

    if (items.length > 0) {

        html += `
        <div class='alert alert-block alert-info'>
        ${items.length} {% trans "stock items selected" %}
        </div>`;
    }

    html += `
    <form method='post' action='' class='js-modal-form' enctype='multipart/form-data'>
        <div class='form-group'>
            <label class='control-label requiredField' for='id_label'>
            {% trans "Select Label Template" %}
            </label>
            <div class='controls'>
                <select id='id_label' class='select form-control' name='label'>
                    ${label_list}
                </select>
            </div>
        </div>
        ${plugin_selection}
    </form>`;

    openModal({
        modal: modal,
    });

    modalEnable(modal, true);
    modalSetTitle(modal, '{% trans "Select Label Template" %}');
    modalSetContent(modal, html);

    attachSelect(modal);

    modalSubmit(modal, function() {

        var label = $(modal).find('#id_label').val();
        var plugin = $(modal).find('#id_plugin').val();

        closeModal(modal);

        if (options.success) {
            options.success({
                // Return the selected label template and plugin
                label: label,
                plugin: plugin,
            });
        }
    });
}
