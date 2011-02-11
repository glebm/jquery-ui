(function($, undefined) {
    var dataByValue = {}, autocompleteDataByValue = {};

    $.widget("ui.combobox", {
        options: {
            dataFilter: null,

            minLength: 1,

            highlight: function(text, escapedTerm) {
                if (!escapedTerm) {
                    return text;
                }
                return text.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + escapedTerm + ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<b>$1</b>");
            },

            placeholder: "Type to search...",
            primaryButtonIcon: "ui-icon-triangle-1-s",
            preventFormSubmit: true
        },

        clear: function() {
            $(this).val("");
            this.element.val("");
            this.input.data("autocomplete").term = "";
            this.input.val("");
        },

        _create: function() {
            var options = this.options;


            var self = this,
                    $select = this.element.hide(),
                    selected = $select.children(":selected"),
                    value = selected.val() ? selected.text() : "";
            var $input = this.input = $("<input class='combobox'>")
                    .insertAfter($select)
                    .val(value);

            var optionByValue = {};
            $select.find('option').each(function() {
               optionByValue[this.value] = this;
            });

            var filter = options.dataFilter,
                    placeholder = $select.attr('data-placeholder') || options['placeholder'],
                    primaryButtonIcon = $select.attr('data-primary-button-icon') || options['primaryButtonIcon'];

            placeholder && $input.attr('placeholder', placeholder);

            var data = $select.find("option").map(function() {
                if (!this.value) {
                    return null;
                }
                var text = this.innerText || this.textContent,
                        parent = this.parentNode,
                        result = {
                            text   : text       ,
                            trimmed: text.trim(),
                            value  : this.value
                        };

                if (parent && parent.nodeType === 1 && parent.nodeName.toLowerCase() == "optgroup") {
                    result.group = parent.label;
                }
                dataByValue[this.value] = result;

                return result;
            });


            if (options.preventFormSubmit) {
                $input.keydown(function(event) {
                    if (event.keyCode == 13) {
                        event.preventDefault();
                        $input.autocomplete('option', 'change').call($input, event, {});
                        $input.autocomplete('close')
                    }
                });
            }

            $input.autocomplete({
                delay: 0,
                minLength: 0,

                // Show only matched items
                source: function(request, response) {
                    if (request.term && request.term.length < options.minLength) {
                        response([]);
                        return;
                    }
                    var termForRegex = $.ui.autocomplete.escapeRegex(request.term),
                            matcher = new RegExp(termForRegex, "i");
                    self._trigger("search", null, request.term);
                    response(data.map(function() {
                        var result;
                        if (this && (!request.term || matcher.test(this.trimmed)) && !(filter && filter(this)))
                            autocompleteDataByValue[this.value] = result = {
                                label: options.highlight(this.text, termForRegex),
                                value: this.trimmed,
                                group: this.group,
                                optionValue: this.value
                            };
                            return result;
                    }));
                },

                change: function(event, ui) {
                    if (ui.item) {
                        return false;
                    }
                    var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex(this.value) + "$", "i"), valid = false;
                    data.each(function() {
                        if (matcher.test(this.trimmed) && !(filter && filter(this))) {
                            var option = optionByValue[this.value];
                            $input[0].value = this.trimmed;
                            option.selected = valid = true;
                            self._trigger("selected", event, {
                                item: option
                            });
                            $select.trigger("change");
                            return false;
                        }
                    });

                    if (!valid) {
                        // remove invalid value, as it didn't match anything
                        self.clear();
                    }
                    return false;
                },

                select: function(event, ui) {
                    // Clear the box if not item was selected and the value typed in does not match anything
                    var option = optionByValue[ui.item.optionValue];
                    option.selected = true;
                    $select.trigger("change");
                    return self._trigger("selected", event, {
                        item: option
                    });
                }
            });

            $input.addClass("ui-widget ui-widget-content ui-corner-left");

            var $ac = $input.data("autocomplete");
            $ac._suggest = function(items) {
                var ul = this.menu.element.zIndex(this.element.zIndex() + 1);
                this._renderMenu(ul, items);
                ul.show();
                this._resizeMenu();
                ul.position($.extend({
                    of: this.element
                }, this.options.position));
            };

            $ac._renderMenu = function(ul, items) {
                    var currentGroup = "", listElements = [];
                    $.each(items, function(index, item) {
                        if (item.group && item.group != currentGroup) {
                            listElements[listElements.length] = "<li class='ui-menu-item ui-combobox-group'>" +
                                    $.ui.combobox.escapeHTML(item.group) + "</li>";
                            currentGroup = item.group;
                        }

                        listElements[listElements.length] = "<li class='ui-menu-item' data-value='" +
                                item.optionValue.replace(/'/g, '&#39;') +
                                "'><a class='ui-corner-all' tabIndex='-1'>" + item.label + "</a></li>";
                    });

                    ul[0].innerHTML = listElements.join("");
                };

            var $mc = $ac.menu.options, $mcFocus = $mc.focus, $mcSelect = $mc.select;
            $mc.select = function(event, ui) {
                ui.item.data("item.autocomplete", autocompleteDataByValue[ui.item.attr('data-value')]);
                $mcSelect.call(this, event, ui);
            };

            $mc.focus = function(event, ui) {
                ui.item.data("item.autocomplete", autocompleteDataByValue[ui.item.attr('data-value')]);
                $mcFocus.call(this, event, ui);
            };


            this.button = $("<button type='button' class='combobox'>&nbsp;</button>")
                    .attr("tabIndex", -1)
                    .attr("title", "Show All")
                    .insertAfter($input)
                    .button({
                                icons: {
                                    primary: primaryButtonIcon
                                },
                                text: false
                            })
                    .removeClass("ui-corner-all")
                    .addClass("ui-corner-right ui-button-icon")
                    .click(function() {
                // close if already visible
                if ($input.autocomplete("widget").is(":visible")) {
                    $input.autocomplete("close");
                    return;
                }

                // pass empty string as value to search for, displaying all results
                $input.autocomplete("search", "");
                $input.focus();
            });
        },

        destroy: function() {
            this.input.remove();
            this.button.remove();
            this.element.show();
            $.Widget.prototype.destroy.call(this);
        }
    });

    $.extend($.ui.combobox, {
        version: "@VERSION",
        escapeHTML: function(value) {
            return value.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
        }
    });
})(jQuery);