(function($, undefined) {

    $.widget("ui.combobox", {
        options: {
            dataFilter: null,

            minLength: 1,

            data: function(ui) {
                ui.data = ui.data || ui.element.find("option").map(function() {
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

                    return result;
                });
                return ui.data;
            },


            highlight: function(text, escapedTerm) {
                if (!escapedTerm) {
                    return text;
                }
                return text.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + escapedTerm + ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<b>$1</b>");
            },

            placeholder: "Type to search...",
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


            var self = this, data = options.data,
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
                    placeholder = $select.attr('data-placeholder') || options['placeholder'];

            placeholder && $input.attr('placeholder', placeholder);


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
                    response(data(self).map(function() {
                        if (this && (!request.term || matcher.test(this.trimmed)) && !(filter && filter(this)))
                            return {
                                label: options.highlight(this.text, termForRegex),
                                value: this.trimmed,
                                group: this.group,
                                optionValue: this.value
                            };
                    }));
                },

                change: function(event, ui) {
                    if (ui.item) {
                        return false;
                    }
                    var matcher = new RegExp("^" + $.ui.autocomplete.escapeRegex($(this).val()) + "$", "i"),
                            valid = false;
                    self._trigger("search", event, $(this).val());
                    data(self).each(function() {
                        if (matcher.test(this.trimmed) && !(filter && filter(this))) {
                            var option = optionByValue[this.value];
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

            $input.data("autocomplete")._renderMenu = function(ul, items) {
                var currentGroup = "", listElements = [];
                $.each(items, function(index, item) {
                    if (item.group && item.group != currentGroup) {
                        listElements[listElements.length] = "<li class='ui-combobox-group'>" + $.ui.combobox.escapeHTML(item.group) + "</li>";
                        currentGroup = item.group;
                    }

                    listElements[listElements.length] = "<li data-item.autocomplete='" +
                            JSON.stringify(item).replace(/'/g, '&#39;') + "'><a>" + item.label + "</a></li>";
                });

                ul[0].innerHTML = listElements.join("");

//                ul.find("li:not(.ui-combobox-group)").each(function(i) {
//                   $(this).data("item.autocomplete", items[i]);
//                });
            };

            this.button = $("<button type='button' class='combobox'>&nbsp;</button>")
                    .attr("tabIndex", -1)
                    .attr("title", "Show All Items")
                    .insertAfter($input)
                    .button({
                                icons: {
                                    primary: "ui-icon-triangle-1-s"
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