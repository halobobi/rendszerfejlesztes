function fetchActivityLogs() {
    document.getElementById("goButton").textContent="Loading...";
    document.getElementById("goButton").disabled=true;

    var startDate = new Date(document.getElementById("startDate").value).toISOString();
    var endDate = new Date(document.getElementById("endDate").value).toISOString();
    var accessToken = document.getElementById("accessToken").value;
    
    if (!accessToken) {
        alert("Error: Access token is required!");
        return;
    }
    
    var subscriptionId = "81fb9688-128f-4018-98e9-63f4d5961cf4";
    var resourceId = "/subscriptions/" + subscriptionId + 
                     "/resourceGroups/RG-DevTestLab-Rendszerfejlesztes/providers/Microsoft.DevTestLab/labs/Rendszerfejlesztes";
    
    var baseUrl = "https://management.azure.com/subscriptions/" + subscriptionId + 
                  "/providers/Microsoft.Insights/eventtypes/management/values?" +
                  "api-version=2015-04-01&$filter=" +
                  "eventTimestamp ge '" + startDate + "' and " +
                  "eventTimestamp le '" + endDate + "' and " +
                  "resourceId eq '" + resourceId + "' and " + 
                  "status eq 'Succeeded'";

    var allLogs = [];

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
    });
}

function processLogs(logs) {
    var logContainer = document.getElementById("log-container");
    logContainer.innerHTML = "";

    var filteredLogs = logs.filter(log => 
        (log.authorization?.action === "microsoft.devtestlab/labs/virtualmachines/stop/action" || 
         log.authorization?.action === "microsoft.devtestlab/labs/virtualmachines/start/action" ||
         log.authorization?.action === "microsoft.devtestlab/labs/virtualmachines/claim/action" ||

         log.authorization?.action === "Microsoft.DevTestLab/labs/virtualmachines/stop/action" || 
         log.authorization?.action === "Microsoft.DevTestLab/labs/virtualmachines/start/action" ||
         log.authorization?.action === "Microsoft.DevTestLab/labs/virtualmachines/claim/action")
    );

    if (filteredLogs.length === 0) {
        logContainer.innerHTML = "<p>No matching logs found.</p>";
        return;
    }

    var groupedLogs = {};
    var vmUptime = {};
    if (new Date().getMonth()=="1"){
        var monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 17, 0, 0, 0).getTime();    
    }
    else{
        var monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0).getTime();
    }
    var now = new Date().getTime();

    filteredLogs.forEach(log => {
        var scope = log.authorization?.scope || "";
        var vmName = scope.substring(scope.lastIndexOf("/") + 1) || "Unknown VM";
        
        if (!groupedLogs[vmName]) {
            groupedLogs[vmName] = [];
            vmUptime[vmName] = 0;
        }

        var eventTime = new Date(log.eventTimestamp).getTime();
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

        var runtime = 0;

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

    Object.keys(groupedLogs).sort().forEach(vmName => {
        var vmTable = document.createElement("div");
        vmTable.innerHTML = `
            <h2>${vmName} - Runtime: ${vmUptime[vmName]} h</h2>
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

    document.getElementById("goButton").disabled=false;
    document.getElementById("goButton").textContent="Go";
}

window.onload = function() {
    var startDateInput = document.getElementById("startDate");
    var endDateInput = document.getElementById("endDate");

    if(new Date().getMonth()=="1"){
        var startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 17, 0, 0, 0).toISOString();
    }
    else{
        var startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 0, 0, 0).toISOString();
    }

    var now = new Date().toISOString();

    startDateInput.value = startDate.slice(0, 16);
    endDateInput.value = now.slice(0, 16);
};
