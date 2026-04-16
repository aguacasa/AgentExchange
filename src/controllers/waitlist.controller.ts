import { Body, Controller, Post, Route, SuccessResponse, Tags } from "tsoa";
import { waitlistService } from "../services/waitlist.service";

interface WaitlistSignupBody {
  email: string;
  name: string;
  company?: string;
  /** What the signup is planning to use Callboard for. */
  role: "BUYER" | "SELLER" | "BOTH";
  useCase: string;
}

interface WaitlistSignupResponse {
  id: string;
  email: string;
  createdAt: Date;
}

@Route("waitlist")
@Tags("Waitlist")
export class WaitlistController extends Controller {
  /**
   * Join the Callboard waitlist. Public endpoint — no auth required.
   * Persists the signup and triggers a notification to the team.
   */
  @Post()
  @SuccessResponse(201, "Waitlist signup created")
  public async join(@Body() body: WaitlistSignupBody): Promise<WaitlistSignupResponse> {
    this.setStatus(201);
    const signup = await waitlistService.create({
      email: body.email,
      name: body.name,
      company: body.company,
      role: body.role,
      useCase: body.useCase,
    });
    return {
      id: signup.id,
      email: signup.email,
      createdAt: signup.createdAt,
    };
  }
}
