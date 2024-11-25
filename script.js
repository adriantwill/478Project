const margin = { top: 20, right: 20, bottom: 20, left: 40 };
const width = 960;
const height = 600;
const svg = d3.select("#usMap");
const map_tooltip = d3.select("#map_tooltip");

d3.json("https://d3js.org/us-10m.v1.json").then((us) => {
  const path = d3.geoPath();
  svg
    .append("g")
    .selectAll("path")
    .data(topojson.feature(us, us.objects.states).features)
    .enter()
    .append("path")
    .attr("class", "state")
    .attr("d", path)
    .on("mouseout", function (event, d) {
      d3.select(this).style("fill", "#cce5df");
      map_tooltip.style("display", "none");
    })
    .on("mouseover", function (event, d) {
      d3.select(this).style("fill", "#77cba4");
      const stateId = d.id;
      d3.csv("NFL_team_data.csv").then((data) => {
        console.log(stateId);
        const teamsInState = data.filter((team) => team.id === stateId);
        map_tooltip
          .style("display", "block")
          .style("left", `${event.pageX}px`)
          .style("top", `${event.pageY}px`);
        if (teamsInState.length > 0) {
          const teamInfo = teamsInState
            .map(
              (team) =>
                `<strong>${team.team_name}</strong><br>Stadium: ${team.home_stadium}<br>Conference: ${team.conference}<br>Division: ${team.division}<br>Superbowl Wins: ${team.superbowl_wins}`
            )
            .join("<br><br>");

          map_tooltip.html(`${teamInfo}`);
        } else {
          map_tooltip.html("There is no team in this state");
        }
      });
    });
});

d3.csv("data.csv").then((data) => {
  const margin = { top: 50, right: 20, bottom: 50, left: 200 };
  const width = 1400 - margin.left - margin.right;
  const height = 700 - margin.top - margin.bottom;

  const teams = data.map((d) => d.Tm);
  const weeks = Object.keys(data[0]).slice(4);
  data.forEach((d) => {
    weeks.forEach((week) => {
      d[week] = week === "Bye" ? 0 : +d[week];
    });
  });

  const xScale = d3.scaleBand().domain(weeks).range([0, width]).padding(0.05);

  const yScale = d3.scaleBand().domain(teams).range([0, height]).padding(0.05);

  const colorScale = d3
    .scaleSequential(d3.interpolateBlues)
    .domain([
      d3.min(data, (d) => d3.min(weeks, (week) => d[week])),
      d3.max(data, (d) => d3.max(weeks, (week) => d[week])),
    ]);

  const svg = d3
    .select("#heatmap")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .selectAll(".heatmap")
    .data(
      data.flatMap((d) =>
        weeks.map((week) => ({ team: d.Tm, week, value: d[week] }))
      )
    )
    .enter()
    .append("rect")
    .attr("x", (d) => xScale(d.week))
    .attr("y", (d) => yScale(d.team))
    .attr("id", (d) => `${d.team}-${d.week}`)
    .attr("width", xScale.bandwidth())
    .attr("height", yScale.bandwidth())
    .attr("fill", (d) => colorScale(d.value))
    .on("mouseout", function (event, d) {
      map_tooltip.style("display", "none");
    })
    .on("mouseover", function (event, d) {
      let teamName = d3.select(this).attr("id");
      d3.csv("data.csv").then((data) => {
        [teamName, weekNum] = teamName.split("-");
        const teamData = data.find((row) => row.Tm === teamName);
        const value = teamData[weekNum];
        if (value != "Bye") {
          map_tooltip.html(
            `The ${teamName} had ${value} people show up ${weekNum}`
          );
        } else {
          map_tooltip.html(`The ${teamName} had a bye in ${weekNum}`);
        }
        map_tooltip
          .style("display", "block")
          .style("left", `${event.pageX}px`)
          .style("top", `${event.pageY}px`);
      });
    });

  svg
    .append("g")
    .call(d3.axisTop(xScale))
    .attr("class", "axis")
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "start");

  svg.append("g").call(d3.axisLeft(yScale)).attr("class", "axis");
});

// Initialize Waypoints
// const usMapWaypoint = new Waypoint({
//   element: document.getElementById("usMap"),
//   handler: function (direction) {
//     if (direction === "down") {
//       d3.select("#usMap").style("opacity", 1);
//       d3.select("#heatmap").style("opacity", 0);
//     }
//   },
//   offset: "50%",
// });

// const heatmapWaypoint = new Waypoint({
//   element: document.getElementById("heatmap"),
//   handler: function (direction) {
//     if (direction === "down") {
//       d3.select("#usMap").style("opacity", 0);
//       d3.select("#heatmap").style("opacity", 1);
//     } else {
//       d3.select("#usMap").style("opacity", 1);
//       d3.select("#heatmap").style("opacity", 0);
//     }
//   },
//   offset: "50%",
// });

// // Initial state
// d3.select("#heatmap").style("opacity", 0);
