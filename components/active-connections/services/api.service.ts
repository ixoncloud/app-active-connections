import type { ComponentContext } from "@ixon-cdk/types";
import type { Agent } from "../models/agent";
import type { User } from "../models/user";
import type { ActiveConnection } from "../models/active-connection";
import { formatDistanceToNow } from "date-fns";

export class ApiService {
  context: ComponentContext;
  headers: Record<string, string>;

  constructor(context: ComponentContext) {
    this.context = context;
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + this.context.appData.accessToken.secretId,
      'Api-Application': this.context.appData.apiAppId,
      'Api-Company': this.context.appData.company.publicId,
      'Api-Version': '2',
    };
  }

  /**
   * The amount of audit logs being collected for each agent
   * ! CAREFUL: This can get out of hand quickly if you're dealing with hundreds of agents (= hundreds of requests)
   */
  createAgentAuditlogUrl(agentId: string) {
    return this.context.getApiUrl("AgentAuditLogList", {
      agentId,
      "page-size": "500",
      filters: 'in(target,"AgentConnectedUser")',
      // "AgentDisconnectedUser"
    });
  }

  /**
   * Collects a subset of data
   * If there is more, keep collecting until you have them all
   */
  private async fetchAllPaginated<T>(urlWithParams: string, options: RequestInit): Promise<T[]> {
    let allItems: T[] = [];
    let moreAfter: string | undefined = undefined;
    const baseParams = new URL(urlWithParams).searchParams;
    const baseUrl = urlWithParams.split('?')[0];

    do {
      let url = new URL(baseUrl);
      baseParams.forEach((value, key) => url.searchParams.append(key, value));
      if (moreAfter) {
        url.searchParams.append('page-after', moreAfter);
      }

      const res = await fetch(url.toString(), options);
      const data = await res.json();
      allItems = allItems.concat(data.data || []);
      if (data.moreAfter === moreAfter) break;
      moreAfter = data.moreAfter;
    } while (moreAfter);

    return allItems;
  }

  /**
   * Retrieves all active connections
   */
  async getActiveConnections(): Promise<ActiveConnection[]> {
    const usersUrl = this.context.getApiUrl("UserList", {
      "page-size": "4000",
      fields: "publicId, name, emailAddress",
    });

    const agentsUrl = this.context.getApiUrl("AgentList", {
      "page-size": "4000",
      fields:
        "name,activeStatus,activeVpnSession.rscServer.name,activeVpnSession.rscServer.publicId,activeVpnSession.rscServer.supportedLayers,activeVpnSession.vpnAddress, activeVpnSession.startedOn, vpnChangedOn, connectedUsers",
    });
    const options = { method: "GET", headers: this.headers };

    return await Promise.all([
      this.fetchAllPaginated<Agent>(agentsUrl, options),
      this.fetchAllPaginated<User>(usersUrl, options),
    ]).then(async ([agents, users]) => {
      const agentsWithConnections: Agent[] = agents.filter((a: Agent) => a.connectedUsers.length > 0);

      const results = await Promise.all(
        agentsWithConnections.map((agent) => fetch(this.createAgentAuditlogUrl(agent.publicId), options)
          .then((res) => res.json())
          .then((res) => ({ agent, logs: res.data }))
        )
      );
      const auditLogsAll = results;
      let activeConnections: ActiveConnection[] = [];
      for (let agent of agentsWithConnections) {
        const auditLogs = auditLogsAll.find(
          (log) => agent.publicId === log.agent.publicId
        )?.logs;

        for (let connection of agent.connectedUsers) {
          // Should always exist, because connectedUsers is saying you are connected right now
          const log = auditLogs.find((l: any) => {
            return l.after[0].user.publicId === connection.publicId;
          });

          const user = users.find((u) => u.publicId === connection.publicId);

          activeConnections = [
            ...activeConnections,
            {
              userName: connection.name,
              userId: connection.publicId,
              userEmail: user ? user.emailAddress : "-",
              agentId: agent.publicId,
              agentName: agent.name,
              duration: log.time,
              durationString: this.getDistanceString(log.time),
              durationMillis: this.getDistanceInMilliseconds(log.time),
            },
          ];
        }

      }
      return activeConnections;
    });
  }

  /**
   * Takes the datetime string, and converts into a distance string ('35 minutes')
   */
  getDistanceString(datetimeString: string): string {
    if (!datetimeString) {
      return "Invalid date";
    }

    // Convert the ISO string into a JavaScript Date object
    const dateToCompare = new Date(datetimeString);

    // Use formatDistanceToNow with the key option
    const distance = formatDistanceToNow(dateToCompare, {
      addSuffix: false, // <-- KEY: Removes 'ago' or 'from now'
      includeSeconds: true,
    });

    return distance;
  }

  /**
   * Returns the distance in milliseconds
   * Used for determining the order of the durations 
   */
  getDistanceInMilliseconds(datetimeString: string) {
    if (!datetimeString) {
      return 0;
    }

    const dateToCompare = new Date(datetimeString);
    const now = new Date();

    // The getTime() method returns the number of milliseconds since the Unix Epoch (1970/01/01)
    const differenceMs = now.getTime() - dateToCompare.getTime();

    // We use Math.abs() to return a positive number, representing the absolute duration.
    return Math.abs(differenceMs);
  }
}