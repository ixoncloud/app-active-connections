<script lang="ts">
  import type { ComponentContext } from "@ixon-cdk/types";
  import { onMount } from "svelte";
  import { formatDistanceToNow } from "date-fns";
  import type { Agent } from "./models/agent";
  import type { User } from "./models/user";
  import type { ActiveConnection } from "./models/active-connection";
  import { ApiService } from "./services/api.service";

  export let context: ComponentContext;

  type Column = "userName" | "userEmail" | "agentName" | "duration";

  // let name = "Ian";
  // let url = "";
  let search = "";
  let sortColumn: Column = "duration";
  let sortDirection: "asc" | "desc" = "desc";
  let columns: {
    id: Column;
    name: string;
    navigationUrl?: string;
  }[] = [
    { id: "userName", name: "User" },
    { id: "userEmail", name: "Email" },
    { id: "agentName", name: "Router", navigationUrl: "/devices/" },
    { id: "duration", name: "Duration" },
  ];

  let activeConnections: ActiveConnection[] = [];

  // let generatedConnections: ActiveConnection[] = [];

  let tableWidth = 0;
  let tableScrollTop = 0;

  $: visibleConnections = search
    ? activeConnections.filter((connection) => {
        const s = search.toLowerCase();
        return (
          connection.userName?.toLowerCase().includes(s) ||
          connection.agentName?.toLowerCase().includes(s) ||
          connection.userEmail?.toLowerCase().includes(s)
        );
      })
    : activeConnections;

  $: isNarrow = tableWidth < 320;

  $: sortedConnections = [...visibleConnections].sort((a, b) => {
    let aValue: string | number = a[sortColumn]!;
    let bValue: string | number = b[sortColumn]!;

    if (sortColumn === "duration") {
      aValue = a["durationMillis"];
      bValue = b["durationMillis"];
    }

    if (!aValue || !bValue) {
      return 0;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  function handleSort(column: typeof sortColumn) {
    if (sortColumn !== column) {
      sortColumn = column;
      sortDirection = "desc";
    } else if (sortDirection === "asc") {
      sortColumn = "duration";
      sortDirection = "desc";
    } else {
      sortDirection = "asc";
    }
  }

  // export function formatTimeDistance(datetimeString: string) {
  //   if (!datetimeString) {
  //     return "Invalid date";
  //   }

  //   // Convert the ISO string into a JavaScript Date object
  //   const dateToCompare = new Date(datetimeString);

  //   // Use formatDistanceToNow with the key option
  //   const distance = formatDistanceToNow(dateToCompare, {
  //     addSuffix: false, // <-- KEY: Removes 'ago' or 'from now'
  //     includeSeconds: true,
  //   });

  //   return distance;
  // }

  // export function getDistanceInMilliseconds(datetimeString: string) {
  //   if (!datetimeString) {
  //     return 0;
  //   }

  //   const dateToCompare = new Date(datetimeString);
  //   const now = new Date();

  //   // The getTime() method returns the number of milliseconds since the Unix Epoch (1970/01/01)
  //   const differenceMs = now.getTime() - dateToCompare.getTime();

  //   // We use Math.abs() to return a positive number, representing the absolute duration.
  //   return Math.abs(differenceMs);
  // }

  // function getRandomDatetimeString() {
  //   const now = new Date();
  //   const daysAgo = Math.floor(Math.random() * 30);
  //   const hoursAgo = Math.floor(Math.random() * 24);
  //   const minutesAgo = Math.floor(Math.random() * 60);
  //   const randomDate = new Date(
  //     now.getFullYear(),
  //     now.getMonth(),
  //     now.getDate() - daysAgo,
  //     now.getHours() - hoursAgo,
  //     now.getMinutes() - minutesAgo
  //   );
  //   return randomDate.toISOString();
  // }

  function handleTableScroll(event: Event): void {
    tableScrollTop = (event.target as HTMLDivElement).scrollTop;
  }

  function showTooltipIfEllipsed(event: MouseEvent, text: string) {
    const target = event.currentTarget as HTMLElement;
    if (target.scrollWidth > target.clientWidth) {
      if (!target.querySelector("a")?.hasAttribute("title")) {
        target.querySelector("a")?.setAttribute("title", text);
      }
    } else {
      if (target.querySelector("a")?.hasAttribute("title")) {
        target.querySelector("a")?.removeAttribute("title");
      }
    }
  }

  function getActiveConnections(apiService: ApiService) {
    apiService.getActiveConnections().then((connections) => {
      activeConnections = connections;
    });
  }

  onMount(() => {
    const client = context.createResourceDataClient();
    const apiService = new ApiService(context);
    // client.query([
    //   { selector: 'Agent', fields: ['name', 'connectedUsers'] }
    // ], result => {
    //     connections = result[0].data?.connectedUsers ?? [];
    //   });

    // if (context.inputs.name) {
    //   name = context.inputs.name;
    // }

    // const generatedConnectionsCount = 50;
    // generatedConnections = [];
    // for (let i = 0; i < generatedConnectionsCount; i++) {
    //   const datetime = getRandomDatetimeString();
    //   generatedConnections.push({
    //     userName: `Name${i + 1}`,
    //     userId: `UserId${i + 1}`,
    //     userEmail: `name${i + 1}@gmail.com`,
    //     agentId: `agentId${i + 1}`,
    //     agentName: `agentName${i + 1}`,
    //     duration: datetime,
    //     durationString: formatTimeDistance(datetime),
    //     durationMillis: getDistanceInMilliseconds(datetime),
    //   });
    // }

    // Get the connections immediately
    getActiveConnections(apiService);
    // After this, update the connections every 10 seconds
    window.setInterval(function () {
      getActiveConnections(apiService);
    }, 10000);
  });
</script>

<main>
  <div class="card">
    <div class="card-header with-actions">
      <h3 class="card-title">Active Connections</h3>
      <div class="search-input-container">
        <div class="search-input-prefix">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0z" fill="none" />
            <path
              d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
        </div>
        <input class="search-input" placeholder="Search" bind:value={search} />
      </div>
    </div>
    <div class="card-content">
      {#if tableScrollTop > 0}
        <div class="table-header-drop-shadow" style="width: {tableWidth}px" />
      {/if}
      {#if activeConnections.length}
        <div
          class="table-wrapper"
          bind:clientWidth={tableWidth}
          on:scroll={handleTableScroll}
        >
          <table class="base-table">
            <thead>
              <tr>
                {#each columns as column}
                  <th
                    class="column-header-cell"
                    on:click={() => handleSort(column.id)}
                  >
                    <div class="column-header">
                      <span class="column-name">{column.name}</span>
                      <span class="sort-arrow">
                        {#if sortColumn === column.id}
                          {#if sortDirection === "asc"}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              height="16px"
                              viewBox="0 -960 960 960"
                              width="24px"
                              fill="currentColor"
                              ><path
                                d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z"
                              /></svg
                            >
                          {/if}
                          {#if sortDirection === "desc"}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              height="16px"
                              viewBox="0 -960 960 960"
                              width="24px"
                              fill="currentColor"
                              ><path
                                d="M440-800v487L216-537l-56 57 320 320 320-320-56-57-224 224v-487h-80Z"
                              /></svg
                            >
                          {/if}
                        {/if}
                      </span>
                    </div>
                  </th>
                {/each}
              </tr>
            </thead>
            <tbody>
              {#each sortedConnections as connection}
                <tr data-testid="active-connections-overview-table-row">
                  {#each columns as column}
                    <td
                      on:mouseenter={(e) =>
                        showTooltipIfEllipsed(
                          e,
                          String(
                            column.id !== "duration"
                              ? connection[column.id]
                              : connection["durationString"]
                          )
                        )}
                    >
                      <a
                        title={column.id !== "duration"
                          ? connection[column.id]
                          : connection["durationString"]}
                        href={column.id === "userEmail" &&
                        connection[column.id] !== "-"
                          ? `mailto:${connection[column.id]}`
                          : undefined}
                        class:hasNavigationUrl={!!column.navigationUrl ||
                          (column.id === "userEmail" &&
                            connection[column.id] !== "-")}
                        on:click={() =>
                          column.navigationUrl
                            ? context.navigateByUrl(
                                column.navigationUrl + connection.agentId
                              )
                            : undefined}
                        on:keydown={(e) => {
                          if (
                            column.navigationUrl &&
                            (e.key === "Enter" || e.key === " ")
                          ) {
                            context.navigateByUrl(column.navigationUrl);
                          }
                        }}
                        >{column.id !== "duration"
                          ? connection[column.id]
                          : connection["durationString"]}</a
                      >
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else}
        <div class="no-active-connections">No active connections</div>
      {/if}
    </div>
  </div>
</main>

<style lang="scss">
  @use "./styles/card" as card;
  @use "./styles/table" as table;
  @use "./styles/search-input" as searchInput;
  @use "./styles/sort" as sort;
  $heading-color: #005014;

  main {
    height: 100%;
  }

  .table-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    // padding: 0 0 8px 8px;
    overflow: auto;
    overflow-anchor: none;
    scrollbar-gutter: stable;
    scrollbar-width: thin;
  }

  // .custom-tooltip {
  //   position: fixed;
  //   background: #fff;
  //   color: #222;
  //   padding: 6px 16px;
  //   border-radius: 4px;
  //   box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  //   white-space: nowrap;
  //   z-index: 1000;
  //   font-size: 13px;
  //   pointer-events: none;
  // }

  .no-active-connections {
    font-size: 14px;
    margin-bottom: 16px;
  }
</style>
