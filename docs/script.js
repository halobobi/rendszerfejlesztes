function fetchActivityLogs() {
    let logContainer = document.getElementById("log-container");
    logContainer.innerHTML = "";

    document.getElementById("goButton").textContent="Loading...";

    let startDate = new Date(document.getElementById("startDate").value).toISOString();
    let endDate = new Date(document.getElementById("endDate").value).toISOString();
    let accessToken = document.getElementById("accessToken").value;

    if (!accessToken) {
        alert("Error: Access token is required!");
        return;
    }

    let subscriptionId = "81fb9688-128f-4018-98e9-63f4d5961cf4";
    let resourceId = "/subscriptions/" + subscriptionId +
                     "/resourceGroups/RG-DevTestLab-Rendszerfejlesztes/providers/Microsoft.DevTestLab/labs/Rendszerfejlesztes";

    let baseUrl = "https://management.azure.com/subscriptions/" + subscriptionId +
                  "/providers/Microsoft.Insights/eventtypes/management/values?" +
                  "api-version=2015-04-01&$filter=" +
                  "eventTimestamp ge '" + startDate + "' and " +
                  "eventTimestamp le '" + endDate + "' and " +
                  "resourceId eq '" + resourceId + "' and " +
                  "status eq 'Succeeded'";

    let allLogs = [];

    function fetchPage(url) {
        return fetch(url, {
            method: "GET",
            headers: {
                "Authorization": "Bearer " + accessToken,
                "Content-Type": "application/json"
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP error! Status: " + response.status);
            }
            return response.json();
        })
        .then(data => {
            allLogs = allLogs.concat(data.value);
            if (data.nextLink) {
                return fetchPage(data.nextLink);
            }
        });
    }

    fetchPage(baseUrl)
    .then(() => {
        processLogs(allLogs);
    })
    .catch(error => {
        console.error("Error fetching activity logs:", error);
        document.getElementById("log-container").innerHTML = `<p>Error loading data: ${error}</p>`;
        document.getElementById("goButton").textContent="Go";
    });
}

function processLogs(logs) {
    let logContainer = document.getElementById("log-container");

    const teams = {
        "rendfejl1000": "zsbkm",
        "rendfejl1002": "Pookie Bears",
        "rendfejl1003": "Négy",
        "rendfejl1004": "It Girls",
        "rendfejl1005": "Kisvárda",
        "rendfejl1006": "Hajnyírók",
        "rendfejl1008": "Webshoproni",
        "rendfejl1009": "Fifty-Fifty",
        "rendfejl1010": "DebugDivas",
        "rendfejl1011": "CsokiKommandó",
        "rendfejl1012": "Beton",
        "rendfejl1013": "NiBeSzoCsa",
        "rendfejl1016": "DataGridView",
        "rendfejl1018": "Vertikalrotierendekatze",
        "rendfejl1019": "BaBoMaZso",
        "rendfejl1029": "Dream Team",
        "rendfejl2000": "Perfekt",
        "rendfejl10000": "ITElite",
        "rendfejl10001": "Spongyabob",
        "rendfejl10002": "Kék",
        "rendfejl10003": "A rendszerfejlesztők",
        "rendfejl10004": "Tegnapra kellett volna",
        "rendfejl10006": "Bandidos"
      };

    let filteredLogs = logs.filter(log =>
        (log.authorization?.action === "microsoft.devtestlab/labs/virtualmachines/stop/action" ||
         log.authorization?.action === "microsoft.devtestlab/labs/virtualmachines/start/action" ||
         log.authorization?.action === "microsoft.devtestlab/labs/virtualmachines/claim/action" ||

         log.authorization?.action === "Microsoft.DevTestLab/labs/virtualmachines/stop/action" ||
         log.authorization?.action === "Microsoft.DevTestLab/labs/virtualmachines/start/action" ||
         log.authorization?.action === "Microsoft.DevTestLab/labs/virtualmachines/claim/action")
    );

    if (filteredLogs.length === 0) {
        logContainer.innerHTML = "<p>No matching logs found.</p>";
        document.getElementById("goButton").textContent="Go";
        return;
    }

    let groupedLogs = {};
    let vmUptime = {};

    let monthStart;
    if (new Date().getMonth()=="1"){
        monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 17, 0, 0, 0).getTime();
    }
    else{
        monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0).getTime();
    }

    filteredLogs.forEach(log => {
        let scope = log.authorization?.scope || "";
        let vmName = scope.substring(scope.lastIndexOf("/") + 1) || "Unknown VM";

        if (!groupedLogs[vmName]) {
            groupedLogs[vmName] = [];
            vmUptime[vmName] = 0;
        }

        let eventTime = new Date(log.eventTimestamp).getTime();
        groupedLogs[vmName].push({
            caller: log.caller || "Unknown",
            operationName: log.operationName?.localizedValue || "Unknown Operation",
            timestamp: eventTime,
            action: log.operationName?.value || "Unknown Action"
        });
    });

    Object.keys(groupedLogs).forEach(vmName => {
        groupedLogs[vmName].sort((a, b) => b.timestamp - a.timestamp);

        if (groupedLogs[vmName][0].action === "microsoft.devtestlab/labs/virtualmachines/start/action" ||
            groupedLogs[vmName][0].action === "microsoft.devtestlab/labs/virtualmachines/claim/action" ||

            groupedLogs[vmName][0].action === "Microsoft.DevTestLab/labs/virtualmachines/start/action" ||
            groupedLogs[vmName][0].action === "Microsoft.DevTestLab/labs/virtualmachines/claim/action"){
                //fut a gép
                groupedLogs[vmName].unshift({
                    caller: "System",
                    operationName: "Technical operation: Insert current time",
                    timestamp: new Date().getTime(),
                    action: "microsoft.devtestlab/labs/virtualmachines/stop/action"
                });
            }
        if (groupedLogs[vmName][groupedLogs[vmName].length-1].action === "microsoft.devtestlab/labs/virtualmachines/stop/action" ||
            groupedLogs[vmName][groupedLogs[vmName].length-1].action === "Microsoft.DevTestLab/labs/virtualmachines/stop/action"){
            // nem ebben a hónapban lett elindítva
            groupedLogs[vmName].push({
                caller: "System",
                operationName: "Technical operation: Insert first day of month",
                timestamp: monthStart,
                action: "microsoft.devtestlab/labs/virtualmachines/start/action"
            });
        }

        let runtime = 0;

        for (let i = 0; i < groupedLogs[vmName].length; i++) {
            if (groupedLogs[vmName][i].action==="microsoft.devtestlab/labs/virtualmachines/stop/action" ||
                groupedLogs[vmName][i].action==="Microsoft.DevTestLab/labs/virtualmachines/stop/action") {

                if (groupedLogs[vmName][i+1].action==="microsoft.devtestlab/labs/virtualmachines/start/action" ||
                    groupedLogs[vmName][i+1].action==="microsoft.devtestlab/labs/virtualmachines/claim/action" ||

                    groupedLogs[vmName][i+1].action==="Microsoft.DevTestLab/labs/virtualmachines/start/action" ||
                    groupedLogs[vmName][i+1].action==="Microsoft.DevTestLab/labs/virtualmachines/claim/action"){
                        runtime+= groupedLogs[vmName][i].timestamp-groupedLogs[vmName][i+1].timestamp;
                        i++;
                    }
            }

        }

        vmUptime[vmName] = (runtime / 3600000).toFixed(1);

    });

    runtimeTable=document.createElement("table");
    runtimeTable.innerHTML=`
            <caption>Median marked with yellow.</caption>
            <thead class="vm">
                <tr class="vm">
                    <th class="vm">VM name</th>
                    <th class="vm">Team name</th>
                    <th class="vm">Runtime (h)</th>
                </tr>
            </thead>
            `;

    runtimeTable.setAttribute("id", "runtime");
    runtimeTable.setAttribute("class","vm");

    logContainer.appendChild(runtimeTable);

    let sortable_vmUptime=[];

    for (let vm in vmUptime){
        sortable_vmUptime.push([vm,vmUptime[vm]]);
    }

    sortable_vmUptime.sort((a,b)=>a[1]-b[1]);

    for (let i=0;i<sortable_vmUptime.length;i++){
        let vm=sortable_vmUptime[i];

        if (!(vm[0] in teams)){
            teams[vm[0]]="VM_default_team"
        }

        let newRow = document.createElement("tr");
        newRow.setAttribute("class","vm");
        if (i==Math.floor(sortable_vmUptime.length/2)-1){
            newRow.innerHTML=`
            <td class="vm" style="background-color:yellow">${vm[0]}</td>
            <td class="vm" style="background-color:yellow">${teams[vm[0]]}</td>
            <td class="vm" style="background-color:yellow">${vm[1]}</td>`
        }
        else{
            newRow.innerHTML=`<td class="vm">${vm[0]}</td>
            <td>${teams[vm[0]]}</td>
            <td class="vm">${vm[1]}</td>`
        }

        runtimeTable.appendChild(newRow);
    }

    Object.keys(groupedLogs).sort().forEach(vmName => {
        let vmTable = document.createElement("div");
        vmTable.innerHTML = `
            <h2>VM name: ${vmName} - Team name: ${teams[vmName]} -Runtime: ${vmUptime[vmName]} h</h2>
            <table class="vm">
                <thead>
                    <tr class="vm">
                        <th class="vm">Caller</th>
                        <th class="vm">Operation Name</th>
                        <th class="vm">Time</th>
                    </tr>
                </thead>
                <tbody class="vm">
                    ${groupedLogs[vmName].map(log => `
                        <tr class="vm">
                            <td class="vm">${log.caller}</td>
                            <td class="vm">${log.operationName}</td>
                            <td class="vm">${new Date(log.timestamp).toLocaleString()}</td>
                        </tr>`).join("")
                    }
                </tbody>
            </table>
        `;
        logContainer.appendChild(vmTable);
    });

    document.getElementById("goButton").textContent="Go";
}

window.onload = function() {
    let updated=document.getElementById("repoUpdated");

    fetch("https://api.github.com/repos/halobobi/rendszerfejlesztes",{method: "GET",headers: {"Content-Type": "application/json"}})
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP error! Status: " + response.status);
            }
            return response.json();
        })
        .then(data => {updated.textContent=`Repository last updated: ${new Date(data.updated_at).toLocaleString()}`;})
        .catch(error => {updated.textContent=`Failed to get repository data. Error fetching data: ${error}`});

    let startDateInput = document.getElementById("startDate");
    let endDateInput = document.getElementById("endDate");

    let start_date;

    if(new Date().getMonth()=="1"){
        start_date = new Date(new Date().getFullYear(), new Date().getMonth(), 17, 0, 0, 0).toISOString();
    }
    else{
        start_date = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0).toISOString();
    }

    let now = new Date().toISOString();

    startDateInput.value = start_date.slice(0, 16);
    endDateInput.value = now.slice(0, 16);
};
