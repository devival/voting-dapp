const { time, helpers, loadFixture } = require("@nomicfoundation/hardhat-network-helpers")
const { latestBlock } = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time")
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs")
const { expect } = require("chai")
const { ethers } = require("hardhat")
// const { beforeEach, it } = require("mocha")

describe("VotingDapp", function () {
    // We define a fixture to reuse the same setup in every test.
    // We use loadFixture to run this setup once, snapshot that state,
    // and reset Hardhat Network to that snapshot in every test.
    async function deployVotingDappFixture() {
        // Contracts are deployed using the first signer/account by default
        const [owner, candidate, voter] = await ethers.getSigners()

        const VotingDapp = await ethers.getContractFactory("VotingDapp")
        const votingDapp = await VotingDapp.deploy()

        votingDapp.deployed()
        return { VotingDapp, votingDapp, owner, candidate, voter }
    }

    describe("electionStart function", function () {
        it("Emits event with correct arguments", async function () {
            const { votingDapp, owner } = await loadFixture(deployVotingDappFixture)

            await expect(await votingDapp.electionStart(21, 21, 45))
                .to.emit(votingDapp, "ElectionStart")
                .withArgs(
                    1,
                    owner.address,
                    (await time.latest()) + 21,
                    (await time.latest()) + 21 + 21,
                    (await time.latest()) + 45
                )
        })
        it("Reverts if periods don't match", async function () {
            const { votingDapp } = await loadFixture(deployVotingDappFixture)

            await expect(votingDapp.electionStart(20, 21, 45)).to.be.revertedWith(
                "Registration and Voting periods have to be greater than 20 seconds"
            )
            await expect(votingDapp.electionStart(21, 20, 45)).to.be.revertedWith(
                "Registration and Voting periods have to be greater than 20 seconds"
            )
            await expect(votingDapp.electionStart(21, 30, 31)).to.be.revertedWith(
                "Please follow the time conditions: (Registration period + Voting Period) < Ending Time"
            )
        })
    })
    describe("candidateReg function", function () {
        it("Reverts if registration is not live", async function () {
            const { votingDapp, owner, candidate } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45)
            await time.increase(22)

            await expect(votingDapp.connect(candidate).candidateReg(1)).to.be.revertedWith(
                "No registration period open for the given initiator"
            )
        })
        it("Reverts if candidate already registered", async function () {
            const { votingDapp, owner, candidate } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // election ID = 1

            await votingDapp.connect(candidate).candidateReg(1)
            await expect(votingDapp.connect(candidate).candidateReg(1)).to.be.revertedWith("Already registered")
        })
        it("Emits event with correct arguments", async function () {
            const { votingDapp, owner, candidate } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45)

            await expect(votingDapp.connect(candidate).candidateReg(1))
                .to.emit(votingDapp, "CadidateRegistered")
                .withArgs(1, candidate.address)
        })
    })
    describe("vote function", function () {
        it("Emits event with correct arguments", async function () {
            const { votingDapp, owner, candidate, voter } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)
            await votingDapp.connect(candidate).candidateReg(1) // register candidate

            await time.increase(22)

            await expect(votingDapp.connect(voter).vote(1, candidate.address))
                .to.emit(votingDapp, "Voted")
                .withArgs(voter.address, 1, candidate.address)
        })
        it("Reverts if too early for voting", async function () {
            const { votingDapp, owner, candidate, voter } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)
            await votingDapp.connect(candidate).candidateReg(1) // register candidate

            await time.increase(15)

            await expect(votingDapp.connect(voter).vote(1, candidate.address)).to.be.revertedWith(
                "Voting period is not open"
            )
        })
        it("Reverts if too late for voting", async function () {
            const { votingDapp, owner, candidate, voter } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)
            await votingDapp.connect(candidate).candidateReg(1) // register candidate

            await time.increase(43)

            await expect(votingDapp.connect(voter).vote(1, candidate.address)).to.be.revertedWith(
                "Voting period is not open"
            )
        })
        it("Reverts if the candidate is not registered", async function () {
            const { votingDapp, owner, candidate, voter } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)
            // skip registering the candidate
            await time.increase(22)

            await expect(votingDapp.connect(voter).vote(1, candidate.address)).to.be.revertedWith(
                "Candidate is not registered"
            )
        })
        it("Reverts if already voted", async function () {
            const { votingDapp, owner, candidate, voter } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)
            await votingDapp.connect(candidate).candidateReg(1) // register candidate
            await time.increase(22)
            await votingDapp.connect(voter).vote(1, candidate.address) // vote once

            await expect(votingDapp.connect(voter).vote(1, candidate.address)).to.be.revertedWith("Already voted") // vote second time
        })
    })
    describe("Getters", function () {
        it("Gets elections status", async function () {
            const { votingDapp } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)

            expect(await votingDapp.getElectionStatus(1)).to.equal(true)
        })
        it("Gets registration end time", async function () {
            const { votingDapp } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)

            expect(await votingDapp.getRegistrationEndTime(1)).to.equal((await time.latest()) + 21)
        })
        it("Gets voting end time", async function () {
            const { votingDapp } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)

            expect(await votingDapp.getVotingEndTime(1)).to.equal((await time.latest()) + 21 + 21)
        })
        it("Gets election end time", async function () {
            const { votingDapp } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)

            expect(await votingDapp.getElectionEndTime(1)).to.equal((await time.latest()) + 45)
        })
        it("Gets election initiator address", async function () {
            const { votingDapp, owner } = await loadFixture(deployVotingDappFixture)
            await votingDapp.connect(owner).electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)

            expect(await votingDapp.getElectionInitiator(1)).to.equal(owner.address)
        })
        it("Gets candidate votes", async function () {
            const { votingDapp, owner, candidate, voter } = await loadFixture(deployVotingDappFixture)
            await votingDapp.electionStart(21, 21, 45) // start election (regPeriod, votingPer, end)
            await votingDapp.connect(candidate).candidateReg(1) // register candidate
            await time.increase(22) // enter voting time
            await votingDapp.connect(owner).vote(1, candidate.address) // vote #1
            await votingDapp.connect(voter).vote(1, candidate.address) // vote #2
            await votingDapp.connect(candidate).vote(1, candidate.address) // vote #3
            await time.increase(23) // finish the election

            const votingResult = await votingDapp.getCandidateVotes(1, candidate.address)
            expect(votingResult).to.equal("3")
        })
    })
})
