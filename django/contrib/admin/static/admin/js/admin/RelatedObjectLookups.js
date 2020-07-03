/*global SelectBox, interpolate*/
// Handles related-objects functionality: lookup link for raw_id_fields
// and Add Another links.
'use strict';
{
    function showAdminPopup(triggeringLink, name_regexp, add_popup) {
        const name = triggeringLink.id.replace(name_regexp, '');
        const href = new URL(triggeringLink.href);
        if (add_popup) {
            href.searchParams.set('_popup', 1);
        }
        const win = window.open(href, name, 'height=500,width=800,resizable=yes,scrollbars=yes');
        win.focus();
    }

    function showRelatedObjectLookupPopup(triggeringLink) {
        showAdminPopup(triggeringLink, /^lookup_/, true);
    }

    function dismissRelatedLookupPopup(win, chosenId) {
        const name = win.name;
        const elem = document.getElementById(name);
        if (elem.classList.contains('vManyToManyRawIdAdminField') && elem.value) {
            elem.value += ',' + chosenId;
        } else {
            document.getElementById(name).value = chosenId;
        }
        win.close();
    }

    function showRelatedObjectPopup(triggeringLink) {
        showAdminPopup(triggeringLink, /^(change|add|delete)_/, false);
    }

    function updateRelatedObjectLinks(triggeringLink) {
        const value = triggeringLink.value;

        let el = triggeringLink.nextElementSibling;
        while (el) {
            if (el.matches('.view-related, .change-related, .delete-related')) {
                if (value) {
                    el.href = el.dataset.hrefTemplate.replace('__fk__', value);
                } else {
                    el.removeAttribute('href');
                }
            }
            el = el.nextElementSibling;
        }
    }

    function dismissAddRelatedObjectPopup(win, newId, newRepr) {
        const name = win.name;
        const el = document.getElementById(name);
        if (el) {
            if (el.tagName === 'SELECT') {
                el.options[el.options.length] = new Option(
                    newRepr,
                    newId,
                    true,
                    true
                );
            } else if (el.tagName === 'INPUT') {
                if (
                    el.classList.contains('vManyToManyRawIdAdminField') &&
                    el.value
                ) {
                    el.value += ',' + newId;
                } else {
                    el.value = newId;
                }
            }
            // Trigger a change event to update related links if required.
            el.dispatchEvent(new Event('change'));
        } else {
            const toId = name + '_to';
            const o = new Option(newRepr, newId);
            SelectBox.add_to_cache(toId, o);
            SelectBox.redisplay(toId);
        }
        win.close();
    }

    function dismissChangeRelatedObjectPopup(win, objId, newRepr, newId) {
        const id = win.name.replace(/^edit_/, '');
        const selectsSelector = interpolate('#%s, #%s_from, #%s_to', [
            id,
            id,
            id,
        ]);
        document.querySelectorAll(selectsSelector).forEach(function(el) {
            el.querySelectorAll('option').forEach(function(opt) {
                if (opt.value === objId) {
                    opt.textContent = newRepr;
                    opt.value = newId;
                }
            });
            el.nextElementSibling.querySelectorAll('.select2-selection__rendered').forEach(function(selection) {
                selection.lastChild.textContent = newRepr;
                selection.title = newRepr;
            });
        });

        win.close();
    }

    function dismissDeleteRelatedObjectPopup(win, objId) {
        const id = win.name.replace(/^delete_/, '');
        const selectsSelector = interpolate('#%s, #%s_from, #%s_to', [
            id,
            id,
            id,
        ]);
        document.querySelectorAll(selectsSelector).forEach(function(el) {
            el.querySelectorAll('option').forEach(function(opt) {
                if (opt.value === objId) {
                    opt.remove();
                }
            });
            el.dispatchEvent(new Event('change'));
        });
        win.close();
    }

    window.showRelatedObjectLookupPopup = showRelatedObjectLookupPopup;
    window.dismissRelatedLookupPopup = dismissRelatedLookupPopup;
    window.showRelatedObjectPopup = showRelatedObjectPopup;
    window.updateRelatedObjectLinks = updateRelatedObjectLinks;
    window.dismissAddRelatedObjectPopup = dismissAddRelatedObjectPopup;
    window.dismissChangeRelatedObjectPopup = dismissChangeRelatedObjectPopup;
    window.dismissDeleteRelatedObjectPopup = dismissDeleteRelatedObjectPopup;

    // Kept for backward compatibility
    window.showAddAnotherPopup = showRelatedObjectPopup;
    window.dismissAddAnotherPopup = dismissAddRelatedObjectPopup;

    // Call function fn when the DOM is loaded and ready. If it is already
    // loaded, call the function now.
    // http://youmightnotneedjquery.com/#ready
    function ready(fn) {
        if (document.readyState !== 'loading') {
            fn();
        } else {
            document.addEventListener('DOMContentLoaded', fn);
        }
    }

    ready(function() {
        function addDeferredEventListener(container, type, selector, listener) {
            container.addEventListener(type, function(event) {
                const el = event.target.closest(selector);
                if (el) {
                    listener(event, el);
                }
            });
        }

        document
            .querySelectorAll('a[data-popup-opener]')
            .forEach(function(el) {
                el.addEventListener('click', function(event) {
                    event.preventDefault();
                    opener.dismissRelatedLookupPopup(
                        window,
                        event.currentTarget.dataset.popupOpener
                    );
                });
            });

        addDeferredEventListener(
            document.body,
            'click',
            '.related-widget-wrapper-link',
            function(event, el) {
                event.preventDefault();
                if (el.href) {
                    const customEvent = new CustomEvent('django:show-related', {
                        detail: el.href,
                    });
                    el.dispatchEvent(customEvent);
                    if (!customEvent.defaultPrevented) {
                        showRelatedObjectPopup(el);
                    }
                }
            }
        );

        addDeferredEventListener(
            document.body,
            'change',
            '.related-widget-wrapper select',
            function(event, el) {
                const customEvent = new CustomEvent('django:update-related');
                el.dispatchEvent(customEvent);
                if (!customEvent.defaultPrevented) {
                    updateRelatedObjectLinks(el);
                }
            }
        );
        document
            .querySelectorAll('.related-widget-wrapper select')
            .forEach(function(el) {
                el.dispatchEvent(new Event('change'));
            });

        addDeferredEventListener(
            document.body,
            'click',
            '.related-lookup',
            function(event, el) {
                event.preventDefault();
                const customEvent = new CustomEvent('django:lookup-related');
                el.dispatchEvent(customEvent);
                if (!customEvent.defaultPrevented) {
                    showRelatedObjectLookupPopup(el);
                }
            }
        );
    });
}
