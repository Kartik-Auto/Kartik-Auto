// spec: specs/invite-new-player.md
// seed: tests/seed.spec.ts

import { expect, test } from '@playwright/test';
import { InvitePlayerPage } from './pages/InvitePlayerPage';
import { LoginPage } from './pages/LoginPage';
import { ProgramPage } from './pages/ProgramPage';
import { TeamPage } from './pages/TeamPage';
import { redactApiBody } from './helpers/apiSnapshot';
import { config, getEnvName } from './helpers/env';

test.describe('Invite New Player — FutureOne Sports', () => {
  test('INV-01 | Invite new player linked to unknown guardian', async ({ page }) => {
    const loginPage = new LoginPage(page);
    const programPage = new ProgramPage(page);
    const teamPage = new TeamPage(page);
    const invitePlayer = new InvitePlayerPage(page);

    // Log in and open a program that already has teams, so the invited player
    // lands on a roster the organiser can also verify manually.
    await loginPage.goto(config.baseUrl);
    await loginPage.login(config.username, config.password);
    await expect(page).not.toHaveURL(/\/login\/?$/i);

    const programName = await programPage.openProgramWithExistingTeams();
    expect(programName.length).toBeGreaterThan(0);

    const { teamName, organizationName } = await teamPage.openExistingTeam();
    console.log(`[InviteNewPlayer] Organisation: "${organizationName}"`);
    console.log(`[InviteNewPlayer] Adding player on program: "${programName}"`);
    console.log(`[InviteNewPlayer] Using existing team: "${teamName}"`);

    // Existing Roster → Invite New Player
    await invitePlayer.openInviteNewPlayer();

    const player = InvitePlayerPage.buildPlayerInviteData();
    await invitePlayer.enterGuardianEmail(player.guardianEmail);
    await invitePlayer.expectGuardianDoesNotExist();

    await invitePlayer.openLinkedPlayerForm();
    const { apiBody } = await invitePlayer.fillAndSubmitPlayerForm(player);
    // UI + API: form closes only after a 200/201 invite request that carries this player.
    const stableBody = redactApiBody(apiBody, [
      player.guardianEmail,
      player.firstName,
      player.lastName,
      player.contactNumber,
      player.jerseyNumber,
      teamName,
      organizationName,
      programName,
    ]);
    expect(`${JSON.stringify(stableBody, null, 2)}\n`).toMatchSnapshot({
      name: `invite-new-player-${getEnvName()}.json`,
    });
    await invitePlayer.expectInvitationSucceeded(player);
    await invitePlayer.expectPlayerOnRosterOnce(player);

    console.log(
      `[InviteNewPlayer] Invited ${player.firstName} ${player.lastName} ` +
        `(${player.guardianEmail}) to organisation "${organizationName}", ` +
        `program "${programName}", team "${teamName}" ` +
        `as ${player.position} #${player.jerseyNumber}`,
    );
  });
});
