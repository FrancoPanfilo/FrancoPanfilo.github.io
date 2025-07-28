// Carga el JSON localmente (debe estar en la misma carpeta que index.html)
fetch("ca_marmol_data.json")
  .then((response) => response.json())
  .then((json) => {
    const teamInfo = json.files.find(
      (f) => f.path === "team_info.json"
    ).content;
    const players = json.files.find((f) => f.path === "players.json").content;
    const matchHistoryMd = json.files.find(
      (f) => f.path === "match_history.md"
    ).content;
    const achievementsMd = json.files.find(
      (f) => f.path === "achievements.md"
    ).content;

    // Estadísticas generales
    const statsGrid = document.getElementById("statsGrid");
    statsGrid.innerHTML = `
      <div class="stat-card"><h2>Debut</h2><div>${teamInfo.debut}</div></div>
      <div class="stat-card"><h2>Torneos</h2><div>${teamInfo.tournaments_participated}</div></div>
      <div class="stat-card"><h2>Partidos</h2><div>${teamInfo.matches_played}</div></div>
      <div class="stat-card"><h2>Victorias</h2><div>${teamInfo.wins.count} (${teamInfo.wins.percentage})</div></div>
      <div class="stat-card"><h2>Empates</h2><div>${teamInfo.draws.count} (${teamInfo.draws.percentage})</div></div>
      <div class="stat-card"><h2>Derrotas</h2><div>${teamInfo.losses.count} (${teamInfo.losses.percentage})</div></div>
      <div class="stat-card"><h2>Goles a favor</h2><div>${teamInfo.goals.scored}</div></div>
      <div class="stat-card"><h2>Goles en contra</h2><div>${teamInfo.goals.conceded}</div></div>
      <div class="stat-card"><h2>Tarjetas amarillas</h2><div>${teamInfo.cards.yellow}</div></div>
      <div class="stat-card"><h2>Tarjetas rojas</h2><div>${teamInfo.cards.red}</div></div>
    `;

    // Rachas y récords
    document.getElementById("recordsContent").innerHTML = `
      <div><strong>Mejor racha de victorias:</strong> ${
        teamInfo.best_winning_streak || "-"
      }</div>
      <div><strong>Mayor goleada:</strong> ${
        teamInfo.biggest_win
          ? teamInfo.biggest_win.score + " vs " + teamInfo.biggest_win.opponent
          : "-"
      }</div>
    `;

    // Enfrentamientos destacados
    document.getElementById(
      "mostWins"
    ).textContent = `${teamInfo.head_to_head.most_wins_against.team} (${teamInfo.head_to_head.most_wins_against.matches} partidos)`;
    document.getElementById(
      "mostDraws"
    ).textContent = `${teamInfo.head_to_head.most_draws_against.team} (${teamInfo.head_to_head.most_draws_against.matches} partidos)`;
    document.getElementById(
      "mostLosses"
    ).textContent = `${teamInfo.head_to_head.most_losses_against.team} (${teamInfo.head_to_head.most_losses_against.matches} partidos)`;

    // Visualización de tarjetas
    const totalCards = teamInfo.cards.yellow + teamInfo.cards.red;
    const yellowPercent = totalCards
      ? (teamInfo.cards.yellow / totalCards) * 100
      : 0;
    const redPercent = totalCards ? (teamInfo.cards.red / totalCards) * 100 : 0;
    document.getElementById("yellowBar").style.width = yellowPercent + "%";
    document.getElementById("redBar").style.width = redPercent + "%";
    document.getElementById(
      "yellowLabel"
    ).textContent = `Amarillas: ${teamInfo.cards.yellow}`;
    document.getElementById(
      "redLabel"
    ).textContent = `Rojas: ${teamInfo.cards.red}`;

    // Progreso de experiencia y títulos
    const xp = teamInfo.experience_points;
    document.getElementById("experienceContent").innerHTML = `
      <div><strong>Experiencia acumulada:</strong> ${xp.current_xp}</div>
      <div><strong>Título actual:</strong> ${xp.current_title}</div>
      <div><strong>Siguiente título:</strong> ${xp.next_title}</div>
      <div><strong>XP para el siguiente nivel:</strong> ${xp.xp_to_next_level}</div>
    `;

    // Logros
    const ach = teamInfo.achievements;
    document.getElementById("achievementsContent").innerHTML = `
      <div><strong>Logros completados:</strong> ${ach.completed} / ${ach.total}</div>
    `;

    // Plantilla de jugadores con filtro
    const playersGrid = document.getElementById("playersGrid");
    function renderPlayers(filter = "") {
      playersGrid.innerHTML = players
        .filter((player) =>
          player.name.toLowerCase().includes(filter.toLowerCase())
        )
        .map(
          (player) => `
          <div class="player-card">
            <img src="${player.image}" alt="${
            player.name
          }" onerror="this.src='https://via.placeholder.com/90x90?text=Jugador';">
            <h3>${player.name}</h3>
            ${
              player.alias
                ? `<div class="alias">Alias: ${player.alias}</div>`
                : ""
            }
            <div class="player-stats">
              <span>Partidos: ${player.matches}</span><br>
              <span>Goles: ${player.goals}</span><br>
              <span>Amarillas: ${player.cards.yellow} | Rojas: ${
            player.cards.red
          }</span>
            </div>
          </div>
        `
        )
        .join("");
    }
    renderPlayers();
    document.getElementById("playerFilter").addEventListener("input", (e) => {
      renderPlayers(e.target.value);
    });

    // Historial de partidos con filtro
    const matchesTable = document.querySelector("#matchesTable tbody");
    let allMatches = [];
    const lines = matchHistoryMd.split("\n");
    let inTable = false;
    for (const line of lines) {
      if (line.startsWith("| Date")) inTable = true;
      else if (inTable && line.startsWith("|")) {
        const cols = line.split("|").map((c) => c.trim());
        if (cols.length >= 5 && cols[1] !== "------" && cols[1] !== "Date") {
          allMatches.push({
            date: cols[1],
            opponent: cols[2],
            score: cols[3],
            result: cols[4],
          });
        }
      }
    }
    function renderMatches(filter = "all") {
      let filtered = allMatches;
      if (filter !== "all")
        filtered = allMatches.filter((m) => m.result === filter);
      matchesTable.innerHTML =
        filtered.length > 0
          ? filtered
              .map(
                (match) => `
            <tr>
              <td>${match.date}</td>
              <td>${match.opponent}</td>
              <td>${match.result}</td>
              <td>${match.score}</td>
            </tr>
          `
              )
              .join("")
          : '<tr><td colspan="4">No hay partidos registrados.</td></tr>';
    }
    renderMatches();
    document.querySelectorAll(".match-filters button").forEach((btn) => {
      btn.addEventListener("click", function () {
        document
          .querySelectorAll(".match-filters button")
          .forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        renderMatches(this.dataset.filter);
      });
    });

    // Estado de la liga
    document.getElementById("leagueStatus").textContent =
      teamInfo.league_status;

    // Accesibilidad: foco visible en inputs y botones
    document.querySelectorAll("button, input").forEach((el) => {
      el.addEventListener("focus", function () {
        this.style.outline = "2px solid var(--highlight)";
      });
      el.addEventListener("blur", function () {
        this.style.outline = "";
      });
    });
  })
  .catch((err) => {
    document.body.innerHTML =
      "<h2 style='color:red;text-align:center;'>Error cargando los datos del club. Asegúrate de tener ca_marmol_data.json en la misma carpeta que index.html.</h2>";
    console.error(err);
  });
