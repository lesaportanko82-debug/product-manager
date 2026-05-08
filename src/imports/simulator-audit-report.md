Act as a senior QA analyst, product designer, UX auditor, systems reviewer, and instructional product expert.

Your task is to perform a deep audit of all simulators, interactive tasks, and scenario-based learning mechanics inside my educational product for product managers.

This is not a simple text review.
You must validate the full logic of each simulator and interactive exercise as if it were a real product feature that learners must use successfully.

Audit goals:
1. Check every simulator and interactive task end-to-end
2. Validate user flows and logic of actions
3. Detect technical bugs, broken states, and missing states
4. Check all formulas, calculations, and scoring logic
5. Check whether the simulator is aligned with the learning objective
6. Check whether the exercise is understandable for the learner
7. Check whether instructions, inputs, outputs, and feedback are complete
8. Detect UX friction, logic gaps, and ambiguity
9. Detect visual issues and interface inconsistencies
10. Improve the simulator structure where necessary

What to validate:

A. Learning logic
Check:
- whether the simulator matches the lesson objective
- whether the learner understands what they are supposed to do
- whether the task is too vague, too hard, too easy, or too disconnected from theory
- whether the simulator actually teaches product thinking and not just random clicking
- whether the expected output is clear
- whether success criteria are understandable

B. Flow and interaction logic
Check:
- entry point into the simulator
- onboarding / explanation before start
- sequence of steps
- progression logic
- what happens after each user action
- next-step clarity
- completion logic
- retry logic
- reset logic
- save / continue logic if present
- error handling
- empty states
- loading states
- success states
- failure states
- partial completion states

C. Input / output validation
Check:
- all input fields
- dropdowns
- toggles
- sliders
- calculations
- dynamic outputs
- result summaries
- score logic if present
- whether the output matches the input logically
- whether wrong input is handled correctly
- whether the system prevents or explains invalid actions

D. Formula and calculation logic
Check:
- all formulas inside the simulator
- score calculations
- metric calculations
- growth / retention / funnel / conversion formulas
- business logic
- analytics logic
- expected outputs

Validate:
- mathematical correctness
- consistency of variables
- explanation of variables
- whether the formula shown matches the formula actually used
- whether examples and outputs are correct
- whether rounding / percentages / decimal logic are handled correctly

If anything is wrong, fix it.

E. UX clarity
Check:
- whether the user understands what to do at each step
- whether the simulator explains inputs and outputs well
- whether the labels are clear
- whether buttons are understandable
- whether feedback is immediate and useful
- whether the simulator creates confusion
- whether the user can finish without guessing

F. Feedback quality
Check:
- whether the learner gets meaningful feedback
- whether the system explains mistakes
- whether the user understands why an answer is wrong
- whether feedback helps learning
- whether correct answers are reinforced properly
- whether the simulator gives too little or too much information

G. Visual and UI review
Check:
- layout consistency
- hierarchy
- spacing
- readability
- alignment
- clarity of interactive controls
- broken or overlapping elements
- poor responsive behavior
- visual clutter
- weak emphasis on important results
- inconsistent states
- confusing component behavior

H. Scenario realism
Check:
- whether the simulator feels realistic for a product manager
- whether the cases are believable
- whether the tasks reflect real PM decisions
- whether the data and scenarios make sense
- whether the simulator builds transferable skills

I. Consistency across all simulators
Check:
- naming consistency
- instruction style
- feedback style
- UI patterns
- difficulty logic
- completion logic
- scoring logic
- progression rules
- terminology
- button naming
- state naming

What to do when issues are found:
For every issue:
1. Identify the issue
2. Explain why it is a problem
3. Provide the corrected version
4. Suggest a better UX / logic alternative if needed
5. If the simulator flow is broken, redesign the flow
6. If the formula is wrong, fix the formula and expected output
7. If instructions are weak, rewrite them clearly

Do not only comment on problems.
Actively improve the simulator logic wherever possible.

Expected output:
1. Overall simulator audit summary
2. Simulator-by-simulator review
3. Broken flows and missing states
4. Formula and calculation fixes
5. UX issues
6. Technical issues
7. Visual issues
8. Feedback-quality issues
9. Rewritten instructions where needed
10. Improved interaction logic
11. Final recommendations for production-ready simulator quality

Important behavior rules:
- Be strict
- Be practical
- Do not stay abstract
- Think like a real QA + product systems reviewer
- Treat each simulator as a release-ready feature
- If logic is weak, improve it
- If flow is broken, redesign it
- If feedback is unclear, rewrite it
- If formulas are wrong, correct them
- If states are missing, define them

Final instruction:
Audit every simulator and interactive exercise as if it were going into release.
Check learning value, flow logic, formulas, UX clarity, technical behavior, interface consistency, and visual quality.
Then fix and improve everything that weakens the product.