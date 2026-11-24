$(function () {
    const username = "UTRGV Vaqueros";
    const CUSTOMERS_PER_PAGE = 10;

    const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const number = new Intl.NumberFormat("en-US");

    // Escape text from the database before inserting it as HTML
    function escapeHtml(text) {
        return $("<div>").text(text == null ? "" : String(text)).html();
    }

    // "2026-09-15" -> "09/15/2026"
    function formatDate(isoDate) {
        const [y, m, d] = String(isoDate).split("-");
        return `${m}/${d}/${y}`;
    }

    function capitalize(text) {
        text = String(text);
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function showError(selector, message) {
        $(selector).text(message || "Could not load data");
    }

    function fillList(selector, alerts) {
        const list = $(selector).empty();
        alerts.forEach(alert => {
            list.append($("<li>").text(alert.description));
        });
    }

    // Welcome message
    $("#username").text(username);


    // Revenue (two elements share the .revenue-amt class)
    $.getJSON("/api/sales/revenue")
        .done(data => $(".revenue-amt").text(currency.format(data.revenue)))
        .fail(() => showError(".revenue-amt", "N/A"));

    $.getJSON("/api/customers/count")
        .done(data => $("#customer-num").text(number.format(data.count)))
        .fail(() => showError("#customer-num", "N/A"));

    $.getJSON("/api/orders/count")
        .done(data => $("#orders-amt").text(number.format(data.count)))
        .fail(() => showError("#orders-amt", "N/A"));

    $.getJSON("/api/alerts/issues/count")
        .done(data => $("#issues-amt").text(number.format(data.count)))
        .fail(() => showError("#issues-amt", "N/A"));

    $.getJSON("/api/sales")
        .done(sales => {
            const salesTableBody = $("#salesTableBody").empty();
            sales.forEach(sale => {
                const row = $("<tr>");
                row.html(`
                    <td>${escapeHtml(sale.name)}</td>
                    <td>${number.format(sale.quantity)}</td>
                    <td>${currency.format(sale.saleamount)}</td>
                `);
                salesTableBody.append(row);
            });
        })
        .fail(() => $("#salesTableBody").html('<tr><td colspan="3">Could not load sales</td></tr>'));


    function renderCustomers(customers) {
        const tableBody = $("#customerTableBody").empty();

        customers.forEach(customer => {
            const status = String(customer.status).toLowerCase();
            let statusClass;
            if (status === "active") {
                statusClass = "status-active";
            } else if (status === "inactive") {
                statusClass = "status-inactive";
            } else {
                statusClass = "status-pending";
            }

            const row = $("<tr>");
            row.html(`
                <td>${escapeHtml(customer.name)}</td>
                <td>${escapeHtml(customer.email)}</td>
                <td>
                    <span class="status ${statusClass}">
                        ${escapeHtml(capitalize(customer.status))}
                    </span>
                </td>
                <td>${formatDate(customer.datejoined)}</td>
            `);
            tableBody.append(row);
        });
    }

    // Page numbers to show: first, last, and a window around the current page
    function pageList(current, totalPages) {
        const pages = [];
        const windowSize = 2;
        for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || Math.abs(p - current) <= windowSize) {
                pages.push(p);
            } else if (pages[pages.length - 1] !== "…") {
                pages.push("…");
            }
        }
        return pages;
    }

    function renderPagination(page, totalPages) {
        const container = $("#customerPagination").empty();

        const link = (label, target, extraClass) =>
            $("<a href='#'>")
                .text(label)
                .addClass(extraClass || "")
                .attr("data-page", target);

        container.append(link("« Prev", page - 1, page <= 1 ? "disabled" : ""));

        pageList(page, totalPages).forEach(p => {
            if (p === "…") {
                container.append($("<span>").text("…"));
            } else {
                container.append(link(p, p, p === page ? "active" : ""));
            }
        });

        container.append(link("Next »", page + 1, page >= totalPages ? "disabled" : ""));
    }

    function loadCustomers(page) {
        $.getJSON("/api/customers", { page: page, limit: CUSTOMERS_PER_PAGE })
            .done(data => {
                renderCustomers(data.customers);
                renderPagination(data.page, data.totalPages);
            })
            .fail(() => $("#customerTableBody").html('<tr><td colspan="4">Could not load customers</td></tr>'));
    }

    $("#customerPagination").on("click", "a", function (event) {
        event.preventDefault();
        if ($(this).hasClass("disabled") || $(this).hasClass("active")) {
            return;
        }
        loadCustomers(Number($(this).attr("data-page")));
    });

    loadCustomers(1);

    function refreshAccordion() {
        // Content height changed after loading, so let the accordion recalculate
        $("#accordion").accordion("refresh");
    }

    $.getJSON("/api/alerts/issues")
        .done(issues => { fillList("#system-status-list", issues); refreshAccordion(); })
        .fail(() => showError("#system-status-list", "Could not load issues"));

    $.getJSON("/api/alerts/notifications/count")
        .done(data => $("#notification-num").text(number.format(data.count)))
        .fail(() => showError("#notification-num", "N/A"));

    $.getJSON("/api/alerts/notifications")
        .done(notifications => { fillList("#notifications-list", notifications); refreshAccordion(); })
        .fail(() => showError("#notifications-list", "Could not load notifications"));

    $.getJSON("/api/alerts/tasks")
        .done(tasks => { fillList("#tasks-list", tasks); refreshAccordion(); })
        .fail(() => showError("#tasks-list", "Could not load tasks"));


    // All six jQuery UI functions

    $("button").button();

    $("#dashboardTabs").tabs();

    $("#customerDate").datepicker();

    $("#accordion").accordion({
        collapsible: true,
        heightStyle: "content"
    });

    $("#customerDialog").dialog({
        autoOpen: false,
        modal: true,
        width: 450,
        buttons: {
            "Create Customer": function () {
                var name = $("#customerName").val();
                var email = $("#customerEmail").val();
                if (!name || !email) {
                    alert(
                        "Please enter a name and email."
                    );
                    return;
                }

                alert("Customer created: " + name);
                $(this).dialog("close");
            },
            "Cancel": function () {
                $(this).dialog("close");
            }
        }

    });


    $("#newCustomerButton").on(
        "click",
        function () {
            $("#customerDialog").dialog("open");
        }
    );

});